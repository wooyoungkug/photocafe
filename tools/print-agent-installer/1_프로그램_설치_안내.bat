@echo off
chcp 65001 >nul
title PhotoCafe 인쇄 에이전트 - 1단계 프로그램 설치
color 0B

echo.
echo ========================================================
echo   PhotoCafe 로컬 인쇄 에이전트 설치 - 1단계
echo ========================================================
echo.
echo  이 PC에서 PDF 자동 저장 + 작업지시서 자동 인쇄를
echo  하려면 두 가지 무료 프로그램이 필요합니다.
echo.
echo  필요한 프로그램:
echo    1) Node.js     (에이전트 실행용, 약 30MB)
echo    2) SumatraPDF  (PDF 자동 인쇄용, 약 10MB)
echo.
echo ========================================================
echo.
pause

echo.
echo [1/2] Node.js 다운로드 페이지를 엽니다...
echo       (페이지가 열리면 큰 녹색 LTS 버튼을 클릭하세요)
echo.
start https://nodejs.org/ko/download
timeout /t 3 /nobreak >nul

echo.
echo [2/2] SumatraPDF 다운로드 페이지를 엽니다...
echo       (페이지가 열리면 64-bit installer를 다운받으세요)
echo.
start https://www.sumatrapdfreader.org/download-free-pdf-viewer
timeout /t 3 /nobreak >nul

echo.
echo ========================================================
echo  두 프로그램을 모두 다운로드하여 설치하세요.
echo  (둘 다 그냥 다음, 다음 누르면 됩니다)
echo.
echo  설치 완료 후 [2_에이전트_시작.bat]을 더블클릭하세요.
echo ========================================================
echo.
pause
