@echo off
chcp 65001 >nul
cls
echo ========================================
echo 🔄 데이터베이스 백업 복원
echo ========================================
echo.

REM 가장 최신 백업 파일 사용
set BACKUP_FILE=backup_20260115.sql

echo [1/4] 백업 파일 확인 중: %BACKUP_FILE%
if not exist "%BACKUP_FILE%" (
    echo ❌ 백업 파일을 찾을 수 없습니다: %BACKUP_FILE%
    pause
    exit /b 1
)
echo ✅ 백업 파일 확인 완료
echo.

echo [2/4] PostgreSQL 컨테이너 시작 중...
docker-compose up -d postgres
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL 컨테이너 시작 실패
    pause
    exit /b 1
)
echo ✅ PostgreSQL 컨테이너 시작 완료
echo.

echo [3/4] PostgreSQL 준비 대기 중 (10초)...
timeout /t 10 /nobreak >nul
echo.

echo [4/4] 데이터베이스 복원 중...
echo (이 작업은 수 분이 걸릴 수 있습니다)
docker exec -i printing-erp-db psql -U postgres -d printing_erp < %BACKUP_FILE%
if %errorlevel% neq 0 (
    echo ❌ 데이터베이스 복원 실패
    echo.
    echo 문제 해결:
    echo 1. PostgreSQL 컨테이너가 실행 중인지 확인: docker-compose ps
    echo 2. 데이터베이스가 존재하는지 확인: docker exec printing-erp-db psql -U postgres -c "\l"
    pause
    exit /b 1
)
echo.
echo ========================================
echo ✅ 데이터베이스 복원 완료!
echo ========================================
echo.
echo 다음 단계:
echo 1. API 서버 실행: npm run dev
echo 2. 또는 quick-start.bat 실행
echo.
pause
