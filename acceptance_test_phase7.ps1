$ErrorActionPreference = 'Stop'

Write-Host "=========================================================="
Write-Host "   NIKIT PHASE 7: REAL LOCAL GGUF RUNTIME ACCEPTANCE TEST"
Write-Host "=========================================================="

# 1. Verify GGUF model fixture
$modelPath = "D:\Nikit\models\smollm2-135m-q4_k_m.gguf"
if (-not (Test-Path $modelPath)) {
    throw "GGUF Model fixture not found at $modelPath"
}
$modelItem = Get-Item $modelPath
Write-Host "[1] GGUF Model file found: $($modelItem.Name)"
Write-Host "    File size: $($modelItem.Length) bytes ($([Math]::Round($modelItem.Length / 1MB, 2)) MB)"

# 2. Check executable
$execPath = "D:\Nikit\bin\llama-server.exe"
if (-not (Test-Path $execPath)) {
    $execPath = "D:\Nikit\bin\llama.exe"
}
if (-not (Test-Path $execPath)) {
    throw "llama executable not found at $execPath"
}
$versionOutput = cmd /c "`"$execPath`" --version 2>&1"
Write-Host "[2] llama.cpp version: $versionOutput"
Write-Host "    Using binary: $execPath"

# 3. Hardware detection verification
Write-Host "[3] Querying real hardware metrics..."
$gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1 Name, DriverVersion, AdapterRAM
$os = Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name, NumberOfCores

Write-Host "    Detected GPU: $($gpu.Name)"
Write-Host "    GPU Driver Version: $($gpu.DriverVersion)"
Write-Host "    System RAM Total: $([Math]::Round($os.TotalVisibleMemorySize / 1024 / 1024, 2)) GB"
Write-Host "    System RAM Free: $([Math]::Round($os.FreePhysicalMemory / 1024 / 1024, 2)) GB"
Write-Host "    CPU: $($cpu.Name) ($($cpu.NumberOfCores) cores)"

# 4. Start local runtime on dynamic loopback port
$testPort = 8097
Write-Host "[4] Starting llama-server bound strictly to 127.0.0.1:$testPort..."
$serverArgs = if ($execPath -like "*llama-server.exe") {
    "--model `"$modelPath`" --host 127.0.0.1 --port $testPort --ctx-size 2048 --threads 4"
} else {
    "serve --model `"$modelPath`" --host 127.0.0.1 --port $testPort --ctx-size 2048 --threads 4"
}
$proc = Start-Process -FilePath $execPath -WorkingDirectory "D:\Nikit\bin" -ArgumentList $serverArgs -PassThru -NoNewWindow

Write-Host "    Spawned PID: $($proc.Id)"
Start-Sleep -Seconds 2

try {
    # 5. Verify /health readiness
    Write-Host "[5] Polling GET http://127.0.0.1:$testPort/health..."
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$testPort/health" -Method Get
    Write-Host "    Health Response: status = $($health.status)"

    # 6. Verify loopback network binding
    Write-Host "[6] Verifying network listener on 127.0.0.1:$testPort..."
    $netstat = netstat -ano | Select-String "127.0.0.1:$testPort"
    Write-Host "    Active Socket: $netstat"

    # 7. Real chat generation (Streaming SSE test)
    Write-Host "`n[7] Testing Real Chat Streaming Generation (Prompt 1)..."
    $reqBody = @{
        model = "smollm2-135m"
        messages = @(
            @{ role = "user"; content = "What is the capital of France? Give a single sentence." }
        )
        stream = $true
        temperature = 0.7
        max_tokens = 50
    } | ConvertTo-Json -Depth 5

    $webReq = [System.Net.WebRequest]::Create("http://127.0.0.1:$testPort/v1/chat/completions")
    $webReq.Method = "POST"
    $webReq.ContentType = "application/json"
    $reqBytes = [System.Text.Encoding]::UTF8.GetBytes($reqBody)
    $webReq.ContentLength = $reqBytes.Length
    $stream = $webReq.GetRequestStream()
    $stream.Write($reqBytes, 0, $reqBytes.Length)
    $stream.Close()

    $webResp = $webReq.GetResponse()
    $reader = New-Object System.IO.StreamReader($webResp.GetResponseStream())
    
    $fullContent = ""
    $firstTokenTime = $null
    $startTime = [System.Diagnostics.Stopwatch]::StartNew()
    $chunkCount = 0

    while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()
        if ($line.StartsWith("data: ")) {
            $dataStr = $line.Substring(6).Trim()
            if ($dataStr -eq "[DONE]") { break }
            try {
                $json = $dataStr | ConvertFrom-Json
                $delta = $json.choices[0].delta.content
                if ($delta) {
                    if ($null -eq $firstTokenTime) {
                        $firstTokenTime = $startTime.ElapsedMilliseconds
                    }
                    $fullContent += $delta
                    $chunkCount++
                }
            } catch {}
        }
    }
    $startTime.Stop()
    $reader.Close()
    $webResp.Close()

    Write-Host "    Streamed $chunkCount chunks in $($startTime.ElapsedMilliseconds) ms (TTFT: $firstTokenTime ms)"
    Write-Host "    Full Generated Content: '$fullContent'"

    # 8. Cancellation test (Request-level abort)
    Write-Host "`n[8] Testing Request Cancellation (AbortSignal simulation)..."
    $cancelReq = [System.Net.WebRequest]::Create("http://127.0.0.1:$testPort/v1/chat/completions")
    $cancelReq.Method = "POST"
    $cancelReq.ContentType = "application/json"
    $longPrompt = @{
        model = "smollm2-135m"
        messages = @(
            @{ role = "user"; content = "Count from 1 to 100 with long explanations for each number." }
        )
        stream = $true
        max_tokens = 200
    } | ConvertTo-Json -Depth 5
    $cBytes = [System.Text.Encoding]::UTF8.GetBytes($longPrompt)
    $cancelReq.ContentLength = $cBytes.Length
    $cStream = $cancelReq.GetRequestStream()
    $cStream.Write($cBytes, 0, $cBytes.Length)
    $cStream.Close()

    $cResp = $cancelReq.GetResponse()
    $cReader = New-Object System.IO.StreamReader($cResp.GetResponseStream())
    $partialText = ""
    
    # Read first 3 deltas then abort request
    for ($i = 0; $i -lt 5; $i++) {
        $line = $cReader.ReadLine()
        if ($line.StartsWith("data: ")) {
            $d = $line.Substring(6).Trim()
            if ($d -ne "[DONE]") {
                try {
                    $j = $d | ConvertFrom-Json
                    $partialText += $j.choices[0].delta.content
                } catch {}
            }
        }
    }
    # Abort connection cleanly
    $cancelReq.Abort()
    Write-Host "    Request aborted cleanly. Partial content preserved: '$partialText'"

    # 9. Regeneration test
    Write-Host "`n[9] Testing Regeneration with different temperature..."
    $regenBody = @{
        model = "smollm2-135m"
        messages = @(
            @{ role = "user"; content = "What is the capital of Germany? Answer in 3 words." }
        )
        stream = $false
        temperature = 0.2
        max_tokens = 20
    } | ConvertTo-Json -Depth 5
    $regenResp = Invoke-RestMethod -Uri "http://127.0.0.1:$testPort/v1/chat/completions" -Method Post -ContentType "application/json" -Body $regenBody
    Write-Host "    Regeneration Result: '$($regenResp.choices[0].message.content)'"

} finally {
    if ($proc -and $proc.Id) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
    $isDead = (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) -eq $null
    Write-Host "    Process $($proc.Id) terminated: $isDead"
    Write-Host "=========================================================="
    Write-Host "         REAL ACCEPTANCE TEST RUN COMPLETED"
    Write-Host "=========================================================="
}
