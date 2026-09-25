$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$wingetPhp = if ($env:LOCALAPPDATA) {
    Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\PHP.PHP.8.2_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe'
} else {
    $null
}
$phpCandidates = @(
    $env:PHP_BIN,
    $wingetPhp,
    'php'
) | Where-Object { $_ }

if (Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host 'Backend is already listening on port 8001.'
    exit 0
}

$phpExe = $null

foreach ($candidate in $phpCandidates) {
    if ($candidate -eq 'php') {
        if (Get-Command php -ErrorAction SilentlyContinue) {
            $phpExe = 'php'
            break
        }

        continue
    }

    if (Test-Path $candidate) {
        $phpExe = $candidate
        break
    }
}

if (-not $phpExe) {
    throw 'PHP executable was not found. Set PHP_BIN or install PHP.'
}

Push-Location (Join-Path $repoRoot 'backend')
& $phpExe -S 127.0.0.1:8001 -t public server.php
Pop-Location
