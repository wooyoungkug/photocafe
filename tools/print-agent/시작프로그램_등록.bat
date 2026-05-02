@echo off
set SRC=C:\dev\Photocafe\tools\print-agent\에이전트_백그라운드실행.vbs
set DST=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PhotoCafe_PrintAgent.vbs
copy "%SRC%" "%DST%" >nul
echo OK: registered to startup
pause
