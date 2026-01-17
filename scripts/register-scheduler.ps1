# Register Auto Git Push task in Windows Task Scheduler
# Run as Administrator

$taskName = "Printing114-AutoGitPush"
$scriptPath = "c:\dev\printing114\scripts\auto-git-push.ps1"

# Remove existing task if exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Existing task removed"
}

# Action
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""

# Trigger (every 30 minutes)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 365)

# Settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Register
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Printing114 Auto Git Push every 30 minutes" -RunLevel Highest

Write-Host ""
Write-Host "Task Scheduler registration complete!" -ForegroundColor Green
Write-Host "Task Name: $taskName"
Write-Host "Interval: 30 minutes"
Write-Host ""
Write-Host "Verify in: taskschd.msc"
