@echo off
chcp 65001 >nul
echo.
echo  PhotoCafe 인쇄 에이전트 - 작업 스케줄러 등록
echo  ================================================
echo.

:: 이 bat 파일과 같은 폴더의 watch-agent.vbs 경로
set "VBS_PATH=%~dp0watch-agent.vbs"

:: watch-agent.vbs 존재 확인
if not exist "%VBS_PATH%" (
    echo [오류] watch-agent.vbs 파일을 찾을 수 없습니다.
    echo        경로: %VBS_PATH%
    pause
    exit /b 1
)

echo  등록 경로: %VBS_PATH%
echo.

:: 기존 작업이 있으면 덮어쓰기 (/f), 로그인 시 실행 (/sc ONLOGON)
schtasks /create ^
  /tn "PhotoCafe 인쇄에이전트" ^
  /tr "wscript.exe \"%VBS_PATH%\"" ^
  /sc ONLOGON ^
  /rl HIGHEST ^
  /f >nul 2>&1

if %errorlevel% equ 0 (
    echo  [성공] 작업 스케줄러에 등록되었습니다.
    echo.
    echo  - 다음 로그인부터 자동 실행됩니다.
    echo  - 에이전트가 꺼지면 5초 후 자동 재시작합니다.
    echo.
    echo  지금 바로 시작하려면 아래 명령어를 실행하세요:
    echo    schtasks /run /tn "PhotoCafe 인쇄에이전트"
) else (
    echo  [실패] 등록에 실패했습니다.
    echo         [관리자 권한으로 실행] 후 다시 시도하세요.
    echo         (파일 우클릭 → 관리자 권한으로 실행)
)

echo.
pause
