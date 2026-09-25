$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

& (Join-Path $PSScriptRoot 'start-mysql.ps1')

$backendCommand = "Set-Location '$repoRoot'; powershell -ExecutionPolicy Bypass -File '$repoRoot\scripts\start-backend.ps1'"
$frontendCommand = "Set-Location '$repoRoot'; `$env:VUE_APP_API_BASE_URL='http://127.0.0.1:8001/api'; npm --prefix .\frontend run serve -- --host 127.0.0.1 --port 8080"

Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $backendCommand | Out-Null
Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoExit', '-Command', $frontendCommand | Out-Null

Write-Host 'Started MySQL, backend, and frontend.'
Write-Host 'Frontend: http://127.0.0.1:8080'
Write-Host 'Backend:  http://127.0.0.1:8001'