param(
    [string]$OutputPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'project-health-report.txt')
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot 'backend'
$frontendPath = Join-Path $repoRoot 'frontend'
$composerPhar = Join-Path $repoRoot 'composer.phar'
$npmExecutable = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { 'npm.cmd' } else { 'npm' }
$vueCliExecutable = Join-Path $frontendPath 'node_modules\.bin\vue-cli-service.cmd'
$reportLines = New-Object System.Collections.Generic.List[string]

function Add-Line {
    param([string]$Text = '')

    $script:reportLines.Add($Text) | Out-Null
}

function Add-Section {
    param([string]$Title)

    Add-Line ''
    Add-Line ('=' * 80)
    Add-Line $Title
    Add-Line ('=' * 80)
}

function Resolve-PhpExecutable {
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

    foreach ($candidate in $phpCandidates) {
        if ($candidate -eq 'php') {
            if (Get-Command php -ErrorAction SilentlyContinue) {
                return 'php'
            }

            continue
        }

        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Resolve-ComposerInvocation {
    param([string]$PhpExecutable)

    if (Get-Command composer -ErrorAction SilentlyContinue) {
        return @('composer')
    }

    if ($PhpExecutable -and (Test-Path $composerPhar)) {
        return @($PhpExecutable, $composerPhar)
    }

    return $null
}

function ConvertTo-EscapedArgumentList {
    param([string[]]$ArgumentList)

    $escapedArgs = @()
    foreach ($argument in $ArgumentList) {
        if ($argument -match '[\s"]') {
            $escapedArgs += ('"' + ($argument -replace '"', '\"') + '"')
        }
        else {
            $escapedArgs += $argument
        }
    }

    return ,$escapedArgs
}

function Invoke-ReportCommand {
    param(
        [string]$Title,
        [string]$ProgramPath,
        [string[]]$ArgumentList,
        [string]$WorkingDirectory = $repoRoot,
        [ValidateRange(1, 900)]
        [int]$TimeoutSeconds = 300
    )

    Add-Section $Title
    Add-Line ('Directory: ' + $WorkingDirectory)
    Add-Line ('Command: ' + $ProgramPath + ' ' + ($ArgumentList -join ' '))
    Add-Line ('TimeoutSeconds: ' + $TimeoutSeconds)

    $stdoutPath = [System.IO.Path]::GetTempFileName()
    $stderrPath = [System.IO.Path]::GetTempFileName()

    try {
        $escapedArgs = ConvertTo-EscapedArgumentList $ArgumentList

        $process = Start-Process -FilePath $ProgramPath -ArgumentList $escapedArgs -WorkingDirectory $WorkingDirectory -NoNewWindow -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
        $finished = $process.WaitForExit($TimeoutSeconds * 1000)

        if (-not $finished) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            $process.WaitForExit()
            $exitCode = 124
        }
        else {
            $exitCode = $process.ExitCode
        }

        $output = @()
        if (Test-Path $stdoutPath) {
            $output += Get-Content -Path $stdoutPath -ErrorAction SilentlyContinue
        }

        if (Test-Path $stderrPath) {
            $stderrOutput = Get-Content -Path $stderrPath -ErrorAction SilentlyContinue
            if ($stderrOutput) {
                $output += '--- STDERR ---'
                $output += $stderrOutput
            }
        }

        if (-not $finished) {
            $output += ('Command timed out after ' + $TimeoutSeconds + ' seconds.')
        }
    }
    catch {
        $exitCode = 1
        $output = @($_ | Out-String)
    }
    finally {
        Remove-Item $stdoutPath, $stderrPath -ErrorAction SilentlyContinue
    }

    Add-Line ('ExitCode: ' + $exitCode)

    if ($output) {
        foreach ($line in $output) {
            Add-Line $line
        }
    }
    else {
        Add-Line '[no output]'
    }
}

function Add-ListSection {
    param(
        [string]$Title,
        [string[]]$Lines
    )

    Add-Section $Title

    if (-not $Lines -or $Lines.Count -eq 0) {
        Add-Line '[no findings]'
        return
    }

    foreach ($line in $Lines) {
        Add-Line $line
    }
}

function Test-LocalUrl {
    param([string]$Url)

    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $statusCode = (Invoke-WebRequest -UseBasicParsing $Url).StatusCode
        $stopwatch.Stop()

        Add-Line ($Url + ' => ' + [int]$statusCode + ' in ' + [math]::Round($stopwatch.Elapsed.TotalMilliseconds, 2) + ' ms')
    }
    catch {
        Add-Line ($Url + ' => FAILED: ' + $_.Exception.Message)
    }
}

Add-Section 'Project Health Report'
Add-Line ('GeneratedAt: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Line ('Repository: ' + $repoRoot)

$phpExe = Resolve-PhpExecutable
$composerInvocation = Resolve-ComposerInvocation -PhpExecutable $phpExe

Invoke-ReportCommand -Title 'Root NPM Scripts' -ProgramPath $npmExecutable -ArgumentList @('run') -TimeoutSeconds 60

if (Test-Path $vueCliExecutable) {
    Invoke-ReportCommand -Title 'Frontend Lint' -ProgramPath $vueCliExecutable -ArgumentList @('lint', '--no-fix') -WorkingDirectory $frontendPath -TimeoutSeconds 180
}
else {
    Invoke-ReportCommand -Title 'Frontend Lint' -ProgramPath $npmExecutable -ArgumentList @('--prefix', $frontendPath, 'run', 'lint') -TimeoutSeconds 180
}

Invoke-ReportCommand -Title 'Frontend Production Build' -ProgramPath $npmExecutable -ArgumentList @('--prefix', $frontendPath, 'run', 'build') -TimeoutSeconds 600
Invoke-ReportCommand -Title 'Frontend Dependency Audit' -ProgramPath $npmExecutable -ArgumentList @('--prefix', $frontendPath, 'run', 'audit:policy') -TimeoutSeconds 180

if ($phpExe) {
    Invoke-ReportCommand -Title 'Backend Test Suite' -ProgramPath $phpExe -ArgumentList @('artisan', 'test') -WorkingDirectory $backendPath -TimeoutSeconds 900

    if ($composerInvocation) {
        $composerExecutable = $composerInvocation[0]
        $composerArgs = @()
        if ($composerInvocation.Count -gt 1) {
            $composerArgs += $composerInvocation[1]
        }
        $composerArgs += @('audit', '--no-interaction')

        Invoke-ReportCommand -Title 'Backend Composer Audit' -ProgramPath $composerExecutable -ArgumentList $composerArgs -WorkingDirectory $backendPath -TimeoutSeconds 180
    }
    else {
        Add-ListSection -Title 'Backend Composer Audit' -Lines @('Composer was not found on PATH and composer.phar fallback is unavailable.')
    }
}
else {
    Add-ListSection -Title 'Backend Tooling Check' -Lines @('PHP executable was not found. Backend tests were skipped.', 'Install PHP or set PHP_BIN before rerunning the report.')
}

$markerPattern = '\b(' + ('TO' + 'DO') + '|' + ('FIX' + 'ME') + '|' + ('HA' + 'CK') + ')\b'

$markerMatches = Get-ChildItem -LiteralPath $repoRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch '\\vendor\\' -and
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\dist\\' -and
        $_.FullName -notmatch '\\storage\\logs\\' -and
        $_.FullName -notmatch '\\.git\\' -and
        $_.Name -ne 'composer.phar' -and
        $_.Name -ne 'project-health-report.txt' -and
        $_.Name -ne 'package-lock.json' -and
        $_.Name -ne 'composer.lock' -and
        $_.Extension -in @('.php', '.js', '.vue', '.json', '.md', '.ps1')
    } |
    Select-String -Pattern $markerPattern -CaseSensitive:$false -ErrorAction SilentlyContinue |
    Select-Object -First 200

$markerLines = @()
foreach ($match in $markerMatches) {
    $relativePath = $match.Path.Replace($repoRoot + [System.IO.Path]::DirectorySeparatorChar, '')
    $markerLines += ($relativePath + ':' + $match.LineNumber + ': ' + $match.Line.Trim())
}

Add-ListSection -Title 'Maintenance Markers' -Lines $markerLines

$largestFiles = Get-ChildItem -LiteralPath $repoRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch '\\vendor\\' -and
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\dist\\' -and
        $_.FullName -notmatch '\\.git\\' -and
        $_.Name -ne 'project-health-report.txt'
    } |
    Sort-Object Length -Descending |
    Select-Object -First 30

$sizeLines = @()
foreach ($file in $largestFiles) {
    $relativePath = $file.FullName.Replace($repoRoot + [System.IO.Path]::DirectorySeparatorChar, '')
    $sizeLines += ('{0:N2} MB  {1}' -f ($file.Length / 1MB), $relativePath)
}

Add-ListSection -Title 'Largest Files (Potential Build / Runtime Drag)' -Lines $sizeLines

$logLines = @()
$laravelLog = Join-Path $backendPath 'storage\logs\laravel.log'
if (Test-Path $laravelLog) {
    $recentLog = Get-Content -Path $laravelLog -Tail 80 -ErrorAction SilentlyContinue
    if ($recentLog) {
        $logLines += $recentLog
    }
}

if (-not $logLines.Count) {
    $logLines = @('[no recent log lines]')
}

Add-ListSection -Title 'Recent Laravel Log Tail' -Lines $logLines

Add-Section 'Live Endpoint Checks'
Test-LocalUrl -Url 'http://127.0.0.1:8080'
Test-LocalUrl -Url 'http://127.0.0.1:8001/api/public/snapshot'

$reportDirectory = Split-Path -Parent $OutputPath
if ($reportDirectory -and -not (Test-Path $reportDirectory)) {
    New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
}

$reportLines | Set-Content -Path $OutputPath -Encoding UTF8
Write-Host ('Report written to ' + $OutputPath)
