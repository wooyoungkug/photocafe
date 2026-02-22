# ==========================================
# Synology 자동 배포 초기 설정 (Windows)
# PowerShell에서 실행:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-synology-deploy.ps1
# ==========================================

$ServerIP = "1.212.201.147"
$SSHPort = "22"
$SSHUser = "admin"
$SSHKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
$RepoURL = "https://github.com/wooyoungkug/photocafe"

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Synology Auto Deploy Setup" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# ---- Step 1: SSH Key ----
Write-Host "Step 1/4 - SSH Key Check" -ForegroundColor Yellow

if (Test-Path $SSHKeyPath) {
    Write-Host "  SSH key exists: $SSHKeyPath" -ForegroundColor Green
} else {
    Write-Host "  Generating SSH key..." -ForegroundColor White
    ssh-keygen -t ed25519 -f $SSHKeyPath -N '""'
    Write-Host "  SSH key created!" -ForegroundColor Green
}
Write-Host ""

# ---- Step 2: Register Key on Server ----
Write-Host "Step 2/4 - Register SSH Key on Server" -ForegroundColor Yellow
Write-Host "  Enter server password to register public key." -ForegroundColor White
Write-Host ""

$pubKeyPath = "$SSHKeyPath.pub"
if (Test-Path $pubKeyPath) {
    $pubKey = Get-Content $pubKeyPath -Raw
    Write-Host "  Public key to register:" -ForegroundColor Gray
    Write-Host "  $pubKey" -ForegroundColor DarkGray

    $confirm = Read-Host "  Register on server? (y/N)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        $pubKeyContent = $pubKey.Trim()
        Write-Host "  Enter server password..." -ForegroundColor White
        ssh -p $SSHPort "${SSHUser}@${ServerIP}" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pubKeyContent' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'SSH key registered!'"

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  SSH key registered!" -ForegroundColor Green
        } else {
            Write-Host "  Registration failed. Manual steps:" -ForegroundColor Red
            Write-Host "  1. Copy key: Get-Content $pubKeyPath | clip" -ForegroundColor Gray
            Write-Host "  2. SSH in: ssh ${SSHUser}@${ServerIP}" -ForegroundColor Gray
            Write-Host "  3. Run: echo 'KEY' >> ~/.ssh/authorized_keys" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Skipped." -ForegroundColor Gray
    }
} else {
    Write-Host "  Public key not found: $pubKeyPath" -ForegroundColor Red
}
Write-Host ""

# ---- Step 3: Test SSH ----
Write-Host "Step 3/4 - SSH Connection Test" -ForegroundColor Yellow
Write-Host "  Testing passwordless SSH..." -ForegroundColor White

$testResult = ssh -o BatchMode=yes -o ConnectTimeout=10 -p $SSHPort "${SSHUser}@${ServerIP}" "echo SSH_OK" 2>&1

if ("$testResult" -match "SSH_OK") {
    Write-Host "  SSH key auth SUCCESS!" -ForegroundColor Green
} else {
    Write-Host "  SSH key auth FAILED (password still required)" -ForegroundColor Red
    Write-Host "  Retry Step 2 or set up manually." -ForegroundColor Gray
}
Write-Host ""

# ---- Step 4: GitHub Secrets ----
Write-Host "Step 4/4 - GitHub Secrets Setup" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Add these secrets in GitHub:" -ForegroundColor White
Write-Host "  $RepoURL/settings/secrets/actions" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SSH_HOST = $ServerIP" -ForegroundColor White
Write-Host "  SSH_USER = $SSHUser" -ForegroundColor White
Write-Host "  SSH_PORT = $SSHPort" -ForegroundColor White
Write-Host "  SSH_KEY  = (private key below)" -ForegroundColor White
Write-Host ""

if (Test-Path $SSHKeyPath) {
    Write-Host "  --- Private key for SSH_KEY (copy all) ---" -ForegroundColor Gray
    Get-Content $SSHKeyPath
    Write-Host "  --- End ---" -ForegroundColor Gray
    Write-Host ""

    $copyConfirm = Read-Host "  Copy private key to clipboard? (y/N)"
    if ($copyConfirm -eq 'y' -or $copyConfirm -eq 'Y') {
        Get-Content $SSHKeyPath -Raw | Set-Clipboard
        Write-Host "  Copied to clipboard! Paste in GitHub Secrets." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  After setup, deploy with:" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Option A (GitHub UI):" -ForegroundColor White
Write-Host "  $RepoURL/actions" -ForegroundColor Cyan
Write-Host "  -> Deploy to Synology -> Run workflow" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Option B (Local):" -ForegroundColor White
Write-Host "  npm run deploy" -ForegroundColor Cyan
Write-Host ""
