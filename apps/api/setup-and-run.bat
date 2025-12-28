@echo off
echo ========================================
echo 인쇄업 ERP API 서버 설정 및 실행
echo ========================================
echo.

echo [1/4] Prisma Client 생성 중...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Prisma Client 생성 실패
    pause
    exit /b 1
)
echo ✅ Prisma Client 생성 완료
echo.

echo [2/4] 데이터베이스 스키마 푸시 중...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ❌ 데이터베이스 스키마 푸시 실패
    pause
    exit /b 1
)
echo ✅ 데이터베이스 스키마 푸시 완료
echo.

echo [3/4] Seed 데이터 삽입 중...
call npm run db:seed
if %errorlevel% neq 0 (
    echo ⚠️ Seed 데이터 삽입 실패 (이미 존재하거나 선택적)
)
echo ✅ Seed 데이터 처리 완료
echo.

echo [4/4] API 서버 시작 중...
echo.
echo ========================================
echo 🚀 API 서버 실행
echo ========================================
echo - API: http://localhost:3001
echo - Swagger: http://localhost:3001/api/docs
echo ========================================
echo.
call npm run start:dev
