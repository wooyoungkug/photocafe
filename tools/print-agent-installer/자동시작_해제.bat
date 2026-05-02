@echo off
chcp 65001 >nul
title PhotoCafe 인쇄 에이전트 - 자동 시작 해제
color 0C

echo.
echo ========================================================
echo   PhotoCafe 인쇄 에이전트 - 자동 시작 해제
echo ========================================================
echo.
echo  Windows 시작 시 자동 실행 등록을 제거합니다.
echo  (에이전트 자체는 삭제되지 않습니다)
echo.
pause

set DST=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PhotoCafe_PrintAgent.vbs

if exist "%DST%" (
    del "%DST%"
    color 0A
    echo.
    echo  [성공] 자동 시작 등록이 해제되었습니다.
) else (
    echo.
    echo  자동 시작 등록이 되어있지 않습니다.
)

echo.
pause
