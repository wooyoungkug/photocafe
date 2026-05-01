@echo off
chcp 65001 >nul
title PhotoCafe 인쇄 에이전트 - 자동 시작 등록
color 0E

echo.
echo ========================================================
echo   PhotoCafe 인쇄 에이전트 - Windows 시작 시 자동 실행
echo ========================================================
echo.
echo  이 PC가 부팅될 때 인쇄 에이전트가 자동으로 실행되도록
echo  Windows 시작 프로그램에 등록합니다.
echo.
echo  등록 후에는 컴퓨터를 켤 때마다 자동으로 인쇄 에이전트가
echo  백그라운드에서 실행됩니다 (검은 창 안 뜸).
echo.
echo ========================================================
echo.
pause

set SRC=%~dp0에이전트_백그라운드실행.vbs
set DST=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PhotoCafe_PrintAgent.vbs

if not exist "%SRC%" (
    color 0C
    echo.
    echo  [오류] 에이전트_백그라운드실행.vbs 파일이 없습니다.
    echo  설치 폴더가 손상되었습니다.
    echo.
    pause
    exit /b 1
)

copy "%SRC%" "%DST%" >nul

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo  [성공] 시작 프로그램에 등록되었습니다.
    echo.
    echo  등록 위치:
    echo  %DST%
    echo.
    echo  이제 PC 재부팅 시 에이전트가 자동 실행됩니다.
    echo.
    echo  [참고] 자동 시작을 해제하려면 위 경로의 파일을 삭제하세요.
    echo  (Win+R 키 → shell:startup 입력으로 폴더 열기)
) else (
    color 0C
    echo.
    echo  [실패] 등록 중 오류가 발생했습니다.
)

echo.
pause
