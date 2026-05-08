# PhotoCafe Print Agent Watchdog
# Restarts the agent automatically if it stops.

$agentPath = Join-Path $PSScriptRoot "print-agent.js"
$nodePath  = "C:\Program Files\nodejs\node.exe"
$portNum   = 9199
$logPath   = Join-Path $PSScriptRoot "agent.log"

if (-not (Test-Path $nodePath)) {
    foreach ($c in @(
        "C:\Program Files (x86)\nodejs\node.exe",
        "$env:APPDATA\nvm\current\node.exe"
    )) {
        if (Test-Path $c) { $nodePath = $c; break }
    }
}

if (-not (Test-Path $agentPath)) {
    Add-Content $logPath "[ERROR] print-agent.js not found: $agentPath"
    exit 1
}

function Test-PortInUse {
    $result = netstat -ano | Select-String (":$portNum\s+.*LISTENING")
    return ($null -ne $result)
}

function Stop-AgentByPort {
    $lines = netstat -ano | Select-String ":$portNum\s"
    foreach ($line in $lines) {
        if ($line -match '\s+(\d+)$') {
            $pid_ = [int]$Matches[1]
            if ($pid_ -gt 0) {
                Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Start-Sleep -Seconds 2
}

# Kill any existing agent on port before starting
Stop-AgentByPort

# Watch loop
while ($true) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    if (Test-PortInUse) {
        Add-Content $logPath "[$ts] Port $portNum already in use - waiting 30s"
        Start-Sleep -Seconds 30
        continue
    }

    Add-Content $logPath "[$ts] Starting agent..."
    $proc = Start-Process -FilePath $nodePath `
        -ArgumentList "`"$agentPath`"" `
        -PassThru -WindowStyle Hidden -WorkingDirectory $PSScriptRoot

    $proc.WaitForExit()

    $ts2 = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content $logPath "[$ts2] Agent exited (code $($proc.ExitCode)) - restarting in 5s"
    Start-Sleep -Seconds 5
}
