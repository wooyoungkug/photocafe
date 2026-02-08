# ==========================================
# Windows용 서버 모니터링 스크립트 (PowerShell)
# ==========================================

$API_URL = "http://1.212.201.147:3001/health"
$WEB_URL = "http://1.212.201.147:3000"
$CHECK_INTERVAL = 30
$MAX_RETRIES = 3

function Write-Log {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Type) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] " -NoNewline
    Write-Host "$Type: $Message" -ForegroundColor $color
}

function Test-ServerHealth {
    param([string]$Url, [string]$Name)

    for ($i = 1; $i -le $MAX_RETRIES; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Log "$Name is healthy ✅" "SUCCESS"
                return $true
            }
        }
        catch {
            Write-Log "$Name check failed (attempt $i/$MAX_RETRIES): $($_.Exception.Message)" "WARN"
            Start-Sleep -Seconds 5
        }
    }

    Write-Log "$Name is DOWN after $MAX_RETRIES attempts! 🔴" "ERROR"
    return $false
}

function Restart-DockerContainer {
    param([string]$ContainerName)

    Write-Log "Restarting $ContainerName..." "WARN"

    # SSH로 서버에 접속하여 재시작 (plink 필요)
    # ssh root@1.212.201.147 "sudo docker restart $ContainerName"

    Write-Log "Docker 재시작 명령은 SSH로 수동 실행하세요:" "WARN"
    Write-Log "ssh root@1.212.201.147 'sudo docker restart $ContainerName'" "WARN"
}

Write-Log "==========================================" "INFO"
Write-Log "Printing114 서버 모니터링 시작" "SUCCESS"
Write-Log "API: $API_URL" "INFO"
Write-Log "WEB: $WEB_URL" "INFO"
Write-Log "체크 주기: ${CHECK_INTERVAL}초" "INFO"
Write-Log "==========================================" "INFO"

while ($true) {
    # API 서버 체크
    if (-not (Test-ServerHealth -Url $API_URL -Name "API Server")) {
        Restart-DockerContainer -ContainerName "printing114-api"
    }

    Start-Sleep -Seconds 5

    # WEB 서버 체크
    if (-not (Test-ServerHealth -Url $WEB_URL -Name "WEB Server")) {
        Restart-DockerContainer -ContainerName "printing114-web"
    }

    Start-Sleep -Seconds $CHECK_INTERVAL
}
