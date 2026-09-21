$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

$binDir = if ($PSScriptRoot) { Join-Path $PSScriptRoot "bin" } else { Join-Path (Get-Location) "bin" }
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

$headers = @{ "User-Agent" = "NikitStudio" }
Write-Host "Connecting to GitHub API with TLS 1.2..."
$r = Invoke-RestMethod -Uri "https://api.github.com/repos/ggml-org/llama.cpp/releases/tags/b10631" -Headers $headers

Write-Host "Listing matching binary packages:"
$selectedAsset = $null
foreach ($a in $r.assets) {
    if ($a.name -match "^llama-b[0-9]+-bin-win-avx2-x64\.zip$") {
        Write-Host "FOUND AVX2 BINARY: $($a.name) ($($a.size) bytes)"
        $selectedAsset = $a
        break
    }
}

if (-not $selectedAsset) {
    foreach ($a in $r.assets) {
        if ($a.name -match "^llama-.*-bin-win.*-x64\.zip$" -and -not ($a.name -like "cudart*")) {
            Write-Host "FOUND ALTERNATIVE BINARY: $($a.name)"
            $selectedAsset = $a
            break
        }
    }
}

if ($selectedAsset) {
    $zipPath = Join-Path $binDir "llama.zip"
    Write-Host "Downloading $($selectedAsset.browser_download_url)..."
    Invoke-WebRequest -Uri $selectedAsset.browser_download_url -OutFile $zipPath -UserAgent "NikitStudio"
    Write-Host "Extracting to $binDir..."
    Expand-Archive -Path $zipPath -DestinationPath $binDir -Force
    Remove-Item $zipPath -Force
    Write-Host "Extracted files:"
    Get-ChildItem $binDir | Select-Object Name, Length
} else {
    Write-Host "No matching zip asset found."
}
