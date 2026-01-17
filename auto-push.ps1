# Auto Git Push Script - Runs every 30 minutes
$interval = 30 # minutes

Write-Host "🔄 Auto Git Push Started - Every $interval minutes" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Set-Location "c:\dev\printing114"
    
    # Check if there are changes
    $status = git status --porcelain
    
    if ($status) {
        Write-Host "[$timestamp] Changes detected, committing..." -ForegroundColor Yellow
        git add -A
        git commit -m "Auto-save: $timestamp"
        git push
        Write-Host "[$timestamp] ✅ Push completed!" -ForegroundColor Green
    } else {
        # Check if there are unpushed commits
        $unpushed = git log origin/main..HEAD --oneline 2>$null
        if ($unpushed) {
            Write-Host "[$timestamp] Unpushed commits found, pushing..." -ForegroundColor Yellow
            git push
            Write-Host "[$timestamp] ✅ Push completed!" -ForegroundColor Green
        } else {
            Write-Host "[$timestamp] No changes to push" -ForegroundColor Gray
        }
    }
    
    Write-Host "[$timestamp] Next push in $interval minutes..." -ForegroundColor Cyan
    Start-Sleep -Seconds ($interval * 60)
}
