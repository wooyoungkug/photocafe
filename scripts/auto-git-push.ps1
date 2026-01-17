# Auto Git Push Script
# Automatically commits and pushes changes every 30 minutes

$repoPath = "c:\dev\printing114"
$logFile = "$repoPath\scripts\git-push.log"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -Append -FilePath $logFile -Encoding UTF8
    Write-Host "$timestamp - $Message"
}

Set-Location $repoPath

Write-Log "Auto-push started"

$status = git status --porcelain

if ($status) {
    Write-Log "Changes found: $($status.Count) files"

    git add -A

    $commitMsg = "Auto-save: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git commit -m $commitMsg

    $pushResult = git push 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Log "Push success: $commitMsg"
    } else {
        Write-Log "Push failed: $pushResult"
    }
} else {
    Write-Log "No changes - skipped"
}

Write-Log "Auto-push completed"
Write-Log "---"
