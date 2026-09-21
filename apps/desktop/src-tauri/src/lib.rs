pub mod commands;

use commands::LlamaServerState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(LlamaServerState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_available_port,
            commands::detect_hardware,
            commands::find_llama_executable,
            commands::inspect_gguf_file,
            commands::list_models_directory,
            commands::start_llama_server,
            commands::stop_llama_server,
            commands::get_llama_server_status
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<LlamaServerState>() {
                    let mut child_guard = state.child.lock().unwrap();
                    if let Some(mut child) = child_guard.take() {
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
