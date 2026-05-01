@echo off
title PhotoCafe Print Agent

echo.
echo  ====================================
echo  PhotoCafe Local Print Agent
echo  Port: 9199
echo  DO NOT CLOSE THIS WINDOW
echo  ====================================
echo.

:: node.exe 탐색 순서: PATH -> 일반 설치 경로
where node >nul 2>&1
if %errorlevel% == 0 (
    node "%~dp0print-agent.js"
    goto end
)

:: PATH에 없으면 일반 설치 경로 시도
set NODE_PATHS=C:\Program Files\nodejs\node.exe;C:\Program Files (x86)\nodejs\node.exe
for %%N in (%NODE_PATHS%) do (
    if exist "%%N" (
        "%%N" "%~dp0print-agent.js"
        goto end
    )
)

:: nvm 경로 시도
if exist "%APPDATA%\nvm\nvm.exe" (
    for /d %%D in ("%APPDATA%\nvm\v*") do (
        if exist "%%D\node.exe" (
            "%%D\node.exe" "%~dp0print-agent.js"
            goto end
        )
    )
)

echo.
echo  [ERROR] Node.js not found.
echo  Please install Node.js from: https://nodejs.org
echo.

:end
pause
