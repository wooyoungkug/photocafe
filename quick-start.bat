@echo off
chcp 65001 >nul
cls
echo ========================================
echo 🚀 인쇄업 ERP API 빠른 시작
echo ========================================
echo.

cd /d "%~dp0apps\api"

echo [1/5] 의존성 설치 중...
echo (이 과정은 수 분이 걸릴 수 있습니다)
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ npm install 실패
    pause
    exit /b 1
)
echo ✅ 의존성 설치 완료
echo.

echo [2/5] Prisma Client 생성 중...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Prisma Client 생성 실패
    pause
    exit /b 1
)
echo ✅ Prisma Client 생성 완료
echo.

echo [3/5] 데이터베이스 스키마 푸시 중...
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo ❌ 데이터베이스 스키마 푸시 실패
    echo PostgreSQL이 실행 중인지 확인하세요: docker-compose ps
    pause
    exit /b 1
)
echo ✅ 데이터베이스 스키마 푸시 완료
echo.

echo [4/5] Seed 데이터 삽입 중...
call npm run db:seed
if %errorlevel% neq 0 (
    echo ⚠️  Seed 데이터 삽입 실패 또는 건너뛰기
    echo (이미 데이터가 존재하거나 선택적 단계입니다)
)
echo ✅ Seed 데이터 처리 완료
echo.

echo [5/5] API 서버 시작 중...
echo.
echo ========================================
echo 🎉 설정 완료! API 서버 실행 중...
echo ========================================
echo.
echo 📡 API 서버: http://localhost:3001
echo 📚 Swagger 문서: http://localhost:3001/api/docs
echo.
echo 기본 계정:
echo   관리자 - admin@printing-erp.com / admin1234
echo   매니저 - manager@printing-erp.com / admin1234
echo.
echo ========================================
echo 서버를 중지하려면 Ctrl+C를 누르세요
echo ========================================
echo.

call npm run start:dev
