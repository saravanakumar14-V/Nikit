use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Default)]
pub struct LlamaServerState {
    pub child: Mutex<Option<std::process::Child>>,
    pub port: Mutex<Option<u16>>,
    pub model_path: Mutex<Option<String>>,
    pub executable_path: Mutex<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareInfo {
    pub gpu_name: Option<String>,
    pub vram_total_mb: Option<u64>,
    pub vram_free_mb: Option<u64>,
    pub driver_version: Option<String>,
    pub cuda_available: bool,
    pub cuda_version: Option<String>,
    pub total_ram_mb: Option<u64>,
    pub free_ram_mb: Option<u64>,
    pub cpu_name: Option<String>,
    pub cpu_cores: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutableInfo {
    pub path: String,
    pub exists: bool,
    pub is_valid: bool,
    pub version: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlamaServerStartResult {
    pub pid: u32,
    pub host: String,
    pub port: u16,
    pub base_url: String,
    pub model_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlamaServerStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub base_url: Option<String>,
    pub model_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GgufHeaderInfo {
    pub valid_gguf: bool,
    pub version: Option<u32>,
    pub tensor_count: Option<u64>,
    pub kv_count: Option<u64>,
    pub architecture: Option<String>,
    pub context_length: Option<u32>,
    pub quantization: Option<String>,
    pub file_size_bytes: u64,
}

#[tauri::command]
pub fn get_available_port() -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Failed to bind port: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local address: {}", e))?
        .port();
    drop(listener);
    Ok(port)
}

#[tauri::command]
pub fn detect_hardware() -> Result<HardwareInfo, String> {
    let mut info = HardwareInfo {
        gpu_name: None,
        vram_total_mb: None,
        vram_free_mb: None,
        driver_version: None,
        cuda_available: false,
        cuda_version: None,
        total_ram_mb: None,
        free_ram_mb: None,
        cpu_name: None,
        cpu_cores: Some(std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4)),
    };

    #[cfg(target_os = "windows")]
    {
        let ps_script = "Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, AdapterRAM | ConvertTo-Json -Compress; Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertTo-Json -Compress; Get-CimInstance Win32_Processor | Select-Object Name | ConvertTo-Json -Compress";
        if let Ok(output) = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", ps_script])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();

            for line in lines {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                    if let Some(gpu) = val.get("Name").and_then(|v| v.as_str()) {
                        if info.gpu_name.is_none() {
                            info.gpu_name = Some(gpu.to_string());
                            if let Some(drv) = val.get("DriverVersion").and_then(|v| v.as_str()) {
                                info.driver_version = Some(drv.to_string());
                            }
                            if let Some(ram) = val.get("AdapterRAM").and_then(|v| v.as_u64()) {
                                if ram > 0 {
                                    info.vram_total_mb = Some(ram / (1024 * 1024));
                                }
                            }
                        }
                    }
                    if let Some(total_kb) = val.get("TotalVisibleMemorySize").and_then(|v| v.as_u64()) {
                        info.total_ram_mb = Some(total_kb / 1024);
                        if let Some(free_kb) = val.get("FreePhysicalMemory").and_then(|v| v.as_u64()) {
                            info.free_ram_mb = Some(free_kb / 1024);
                        }
                    }
                    if let Some(cpu) = val.get("Name").and_then(|v| v.as_str()) {
                        if info.cpu_name.is_none() && (cpu.contains("Intel") || cpu.contains("AMD") || cpu.contains("Processor")) {
                            info.cpu_name = Some(cpu.to_string());
                        }
                    }
                }
            }
        }

        if let Ok(output) = Command::new("where.exe").arg("nvcc").output() {
            if output.status.success() {
                info.cuda_available = true;
            }
        }
    }

    Ok(info)
}

#[tauri::command]
pub fn find_llama_executable(app: AppHandle, custom_path: Option<String>) -> Result<ExecutableInfo, String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Some(ref p) = custom_path {
        if !p.trim().is_empty() {
            candidates.push(PathBuf::from(p.trim()));
        }
    }

    if let Ok(res_dir) = app.path().resource_dir() {
        candidates.push(res_dir.join("bin").join("llama.exe"));
        candidates.push(res_dir.join("llama.exe"));
        candidates.push(res_dir.join("bin").join("llama-server.exe"));
        candidates.push(res_dir.join("llama-server.exe"));
    }

    candidates.push(PathBuf::from("d:\\Nikit\\bin\\llama.exe"));
    candidates.push(PathBuf::from("d:\\Nikit\\bin\\llama-server.exe"));
    candidates.push(PathBuf::from("bin\\llama.exe"));
    candidates.push(PathBuf::from("bin\\llama-server.exe"));
    candidates.push(PathBuf::from("./bin/llama.exe"));
    candidates.push(PathBuf::from("./bin/llama-server.exe"));
    candidates.push(PathBuf::from("llama.exe"));
    candidates.push(PathBuf::from("llama-server.exe"));
    candidates.push(PathBuf::from("./llama.exe"));
    candidates.push(PathBuf::from("./llama-server.exe"));
    candidates.push(PathBuf::from("C:\\llama.cpp\\llama.exe"));
    candidates.push(PathBuf::from("C:\\llama.cpp\\llama-server.exe"));
    candidates.push(PathBuf::from("C:\\Program Files\\llama.cpp\\llama.exe"));
    candidates.push(PathBuf::from("C:\\Program Files\\llama.cpp\\llama-server.exe"));

    for path in &candidates {
        if path.exists() && path.is_file() {
            let version = if let Ok(output) = Command::new(path).arg("--version").output() {
                if output.status.success() {
                    let v_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !v_str.is_empty() {
                        Some(v_str)
                    } else {
                        Some("llama.cpp server".to_string())
                    }
                } else {
                    Some("llama.cpp server".to_string())
                }
            } else {
                Some("llama.cpp server".to_string())
            };

            return Ok(ExecutableInfo {
                path: path.to_string_lossy().to_string(),
                exists: true,
                is_valid: true,
                version,
                status: "found".to_string(),
            });
        }
    }

    let default_path = custom_path.unwrap_or_else(|| "llama-server.exe".to_string());
    Ok(ExecutableInfo {
        path: default_path,
        exists: false,
        is_valid: false,
        version: None,
        status: "not_found".to_string(),
    })
}

#[tauri::command]
pub fn inspect_gguf_file(file_path: String) -> Result<GgufHeaderInfo, String> {
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(format!("File not found: {}", file_path));
    }

    let metadata = path.metadata().map_err(|e| e.to_string())?;
    let file_size_bytes = metadata.len();

    let mut file = File::open(path).map_err(|e| e.to_string())?;
    let mut header_buf = [0u8; 32];
    let bytes_read = file.read(&mut header_buf).map_err(|e| e.to_string())?;

    if bytes_read < 16 {
        return Ok(GgufHeaderInfo {
            valid_gguf: false,
            version: None,
            tensor_count: None,
            kv_count: None,
            architecture: None,
            context_length: None,
            quantization: None,
            file_size_bytes,
        });
    }

    let magic = &header_buf[0..4];
    if magic != b"GGUF" {
        return Ok(GgufHeaderInfo {
            valid_gguf: false,
            version: None,
            tensor_count: None,
            kv_count: None,
            architecture: None,
            context_length: None,
            quantization: None,
            file_size_bytes,
        });
    }

    let version = u32::from_le_bytes(header_buf[4..8].try_into().unwrap_or([0, 0, 0, 0]));
    let tensor_count = u64::from_le_bytes(header_buf[8..16].try_into().unwrap_or([0; 8]));
    let kv_count = if bytes_read >= 24 {
        Some(u64::from_le_bytes(header_buf[16..24].try_into().unwrap_or([0; 8])))
    } else {
        None
    };

    Ok(GgufHeaderInfo {
        valid_gguf: true,
        version: Some(version),
        tensor_count: Some(tensor_count),
        kv_count,
        architecture: None,
        context_length: None,
        quantization: None,
        file_size_bytes,
    })
}

#[tauri::command]
pub fn list_models_directory(custom_dir: Option<String>) -> Result<Vec<String>, String> {
    let mut dirs_to_check: Vec<PathBuf> = Vec::new();

    if let Some(ref d) = custom_dir {
        if !d.trim().is_empty() {
            dirs_to_check.push(PathBuf::from(d.trim()));
        }
    }

    dirs_to_check.push(PathBuf::from("models"));
    dirs_to_check.push(PathBuf::from("./models"));
    dirs_to_check.push(PathBuf::from("d:\\Nikit\\models"));

    let mut gguf_files = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for dir in dirs_to_check {
        if dir.exists() && dir.is_dir() {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        if let Some(ext) = path.extension() {
                            if ext.to_string_lossy().eq_ignore_ascii_case("gguf") {
                                let path_str = path.to_string_lossy().to_string();
                                if seen.insert(path_str.clone()) {
                                    gguf_files.push(path_str);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(gguf_files)
}

#[tauri::command]
pub fn start_llama_server(
    state: State<LlamaServerState>,
    executable_path: String,
    model_path: String,
    port: Option<u16>,
    ctx_size: Option<u32>,
    n_gpu_layers: Option<i32>,
    threads: Option<u32>,
) -> Result<LlamaServerStartResult, String> {
    let mut child_guard = state.child.lock().unwrap();
    if let Some(mut existing) = child_guard.take() {
        let _ = existing.kill();
        let _ = existing.wait();
    }

    let exec_p = Path::new(&executable_path);
    if !exec_p.exists() || !exec_p.is_file() {
        return Err(format!("Executable not found: {}", executable_path));
    }

    let model_p = Path::new(&model_path);
    if !model_p.exists() || !model_p.is_file() {
        return Err(format!("Model file not found: {}", model_path));
    }

    let bound_port = match port {
        Some(p) if p > 0 => p,
        _ => get_available_port()?,
    };

    let host = "127.0.0.1";
    let ctx = ctx_size.unwrap_or(2048);
    let gpu_layers = n_gpu_layers.unwrap_or(0);
    let th = threads.unwrap_or(4);

    let mut cmd = Command::new(&executable_path);
    if let Some(parent) = exec_p.parent() {
        cmd.current_dir(parent);
    }
    if executable_path.to_lowercase().ends_with("llama.exe") {
        cmd.arg("serve");
    }
    cmd.arg("--model").arg(&model_path);
    cmd.arg("--host").arg(host);
    cmd.arg("--port").arg(bound_port.to_string());
    cmd.arg("--ctx-size").arg(ctx.to_string());
    cmd.arg("--n-gpu-layers").arg(gpu_layers.to_string());
    cmd.arg("--threads").arg(th.to_string());

    let child = cmd.spawn().map_err(|e| format!("Failed to spawn llama-server: {}", e))?;
    let pid = child.id();

    *child_guard = Some(child);
    *state.port.lock().unwrap() = Some(bound_port);
    *state.model_path.lock().unwrap() = Some(model_path.clone());
    *state.executable_path.lock().unwrap() = Some(executable_path);

    Ok(LlamaServerStartResult {
        pid,
        host: host.to_string(),
        port: bound_port,
        base_url: format!("http://{}:{}", host, bound_port),
        model_path,
    })
}

#[tauri::command]
pub fn stop_llama_server(state: State<LlamaServerState>) -> Result<(), String> {
    let mut child_guard = state.child.lock().unwrap();
    if let Some(mut child) = child_guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    *state.port.lock().unwrap() = None;
    *state.model_path.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub fn get_llama_server_status(state: State<LlamaServerState>) -> Result<LlamaServerStatus, String> {
    let mut child_guard = state.child.lock().unwrap();
    let port = *state.port.lock().unwrap();
    let model_path = state.model_path.lock().unwrap().clone();

    if let Some(child) = child_guard.as_mut() {
        match child.try_wait() {
            Ok(Some(_exit_status)) => {
                *child_guard = None;
                Ok(LlamaServerStatus {
                    running: false,
                    pid: None,
                    host: None,
                    port: None,
                    base_url: None,
                    model_path: None,
                })
            }
            Ok(None) => {
                let pid = child.id();
                let p = port.unwrap_or(8080);
                Ok(LlamaServerStatus {
                    running: true,
                    pid: Some(pid),
                    host: Some("127.0.0.1".to_string()),
                    port: Some(p),
                    base_url: Some(format!("http://127.0.0.1:{}", p)),
                    model_path,
                })
            }
            Err(_) => Ok(LlamaServerStatus {
                running: false,
                pid: None,
                host: None,
                port: None,
                base_url: None,
                model_path: None,
            }),
        }
    } else {
        Ok(LlamaServerStatus {
            running: false,
            pid: None,
            host: None,
            port: None,
            base_url: None,
            model_path: None,
        })
    }
}
