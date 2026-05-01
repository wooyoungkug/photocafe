@echo off
chcp 65001 >nul
title PhotoCafe 인쇄 에이전트
color 0A

echo.
echo ========================================================
echo   PhotoCafe 로컬 인쇄 에이전트
echo ========================================================
echo.
echo  이 창을 닫으면 인쇄/자동저장 기능이 중단됩니다.
echo  부팅 시 자동 실행을 원하면 [3_자동시작_등록.bat] 을
echo  관리자 권한으로 실행하세요.
echo.
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo  [오류] Node.js 가 설치되지 않았습니다.
    echo.
    echo  먼저 [1_프로그램_설치_안내.bat] 을 실행하여
    echo  Node.js 를 설치하세요.
    echo.
    pause
    exit /b 1
)

echo  Node.js 확인됨.
echo  에이전트 시작 중...
echo.

node "%~dp0print-agent.js"

echo.
echo  에이전트가 종료되었습니다.
pause
