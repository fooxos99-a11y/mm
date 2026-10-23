$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$environmentPath = Join-Path $repoRoot 'backend/.env'
if (-not (Test-Path -LiteralPath $environmentPath)) {
    throw 'backend/.env is required for the local MySQL configuration.'
}
$localSettings = @{}
foreach ($line in Get-Content -LiteralPath $environmentPath) {
    if ($line -match '^(DB_CONNECTION|DB_HOST|DB_PORT|MOMARS_MYSQL_DATA_DIR)=(.*)$') {
        $localSettings[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
}
if ($localSettings['DB_CONNECTION'] -ne 'mysql' -or $localSettings['DB_HOST'] -notin @('127.0.0.1', 'localhost', '::1')) {
    throw 'This helper only starts MySQL for a loopback connection.'
}
$mysqlPort = 3306
if ($localSettings['DB_PORT']) { $mysqlPort = [int]$localSettings['DB_PORT'] }
if ($mysqlPort -lt 1 -or $mysqlPort -gt 65535) { throw 'Invalid local MySQL port.' }

function Test-LocalMysqlPort {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.ConnectAsync('127.0.0.1', $mysqlPort)
        return $connection.Wait(500) -and $client.Connected
    } catch { return $false }
    finally { $client.Dispose() }
}

if (Test-LocalMysqlPort) {
    Write-Host "Local MySQL is already listening on port $mysqlPort."
    exit 0
}
$mysqlDataDirectory = $localSettings['MOMARS_MYSQL_DATA_DIR']
if (-not $mysqlDataDirectory -or -not (Test-Path -LiteralPath (Join-Path $mysqlDataDirectory 'auto.cnf'))) {
    throw 'Set MOMARS_MYSQL_DATA_DIR in backend/.env to an existing local MySQL data directory. This helper never initializes or replaces data.'
}
$mysqlExecutable = if ($env:MYSQLD_BIN) { $env:MYSQLD_BIN } else {
    Join-Path $env:ProgramFiles 'MySQL/MySQL Server 8.4/bin/mysqld.exe'
}
if (-not (Test-Path -LiteralPath $mysqlExecutable)) { throw 'MySQL was not found. Set MYSQLD_BIN.' }
$mysqlLogDirectory = Join-Path $env:LOCALAPPDATA 'Momars/mysql-logs'
New-Item -ItemType Directory -Path $mysqlLogDirectory -Force | Out-Null
$mysqlProcess = Start-Process -FilePath $mysqlExecutable -WorkingDirectory $mysqlDataDirectory `
    -ArgumentList @('--no-defaults', "--datadir=`"$mysqlDataDirectory`"", '--bind-address=127.0.0.1', "--port=$mysqlPort", '--mysqlx=0', '--console') `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $mysqlLogDirectory 'mysql.out.log') `
    -RedirectStandardError (Join-Path $mysqlLogDirectory 'mysql.err.log')
$deadline = [DateTime]::UtcNow.AddSeconds(30)
while ([DateTime]::UtcNow -lt $deadline) {
    if (Test-LocalMysqlPort) {
        Write-Host "Local MySQL is ready on port $mysqlPort."
        exit 0
    }
    if ($mysqlProcess.HasExited) { break }
    Start-Sleep -Milliseconds 300
}
throw "Local MySQL did not start. Check $mysqlLogDirectory."
