# ==========================================
# Windows용 운영 서버 배포 스크립트 (PowerShell)
# ==========================================

$SERVER = "root@1.212.201.147"
$PROJECT_DIR = "/volume1/docker/printing114"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Printing114 운영 서버 배포 시작" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

# 1. 코드 업데이트
Write-Host ""
Write-Host "📥 1단계: 코드 업데이트" -ForegroundColor Yellow
ssh $SERVER "cd $PROJECT_DIR && git pull origin main"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 코드 업데이트 실패" -ForegroundColor Red
    exit 1
}

# 2. .env 파일 확인
Write-Host ""
Write-Host "📝 2단계: .env 파일 확인" -ForegroundColor Yellow
Write-Host "⚠️  .env.production 파일에 다음 내용이 있는지 확인하세요:" -ForegroundColor Cyan
Write-Host "DATABASE_URL에 커넥션 풀 파라미터:" -ForegroundColor White
Write-Host "?connection_limit=30&pool_timeout=20&connect_timeout=10" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "✅ .env 파일 확인 완료? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "❌ 배포 중단. .env 파일을 먼저 확인하세요." -ForegroundColor Red
    exit 1
}

# 3. Docker 재빌드 및 재시작
Write-Host ""
Write-Host "🐳 3단계: Docker 재시작" -ForegroundColor Yellow
Write-Host "컨테이너를 중지합니다..." -ForegroundColor Cyan
ssh $SERVER "cd $PROJECT_DIR && sudo docker-compose -f docker-compose.prod.yml down"

Write-Host "새 이미지를 빌드하고 시작합니다..." -ForegroundColor Cyan
ssh $SERVER "cd $PROJECT_DIR && sudo docker-compose -f docker-compose.prod.yml up -d --build"

# 4. 시작 대기
Write-Host ""
Write-Host "⏳ 4단계: 서버 시작 대기 (40초)..." -ForegroundColor Yellow
Start-Sleep -Seconds 40

# 5. 상태 확인
Write-Host ""
Write-Host "🔍 5단계: 상태 확인" -ForegroundColor Yellow
Write-Host "--- Docker 컨테이너 상태 ---" -ForegroundColor Cyan
ssh $SERVER "sudo docker ps --filter 'name=photocafe' --format 'table {{.Names}}\t{{.Status}}'"

Write-Host ""
Write-Host "--- API 로그 (최근 20줄) ---" -ForegroundColor Cyan
ssh $SERVER "sudo docker logs photocafe-api --tail 20"

# 6. Health Check
Write-Host ""
Write-Host "💚 6단계: Health Check" -ForegroundColor Yellow
Write-Host "API Health:" -ForegroundColor Cyan
ssh $SERVER "curl -s http://localhost:3001/health"

Write-Host ""
Write-Host "DB Health:" -ForegroundColor Cyan
ssh $SERVER "curl -s http://localhost:3001/health/db"

# 7. 외부 접속 확인
Write-Host ""
Write-Host "🌐 7단계: 외부 접속 확인" -ForegroundColor Yellow
Write-Host "API Health (외부):" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://1.212.201.147:3001/health" -UseBasicParsing
    Write-Host $response.Content -ForegroundColor Green
} catch {
    Write-Host "❌ 외부 접속 실패: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ 배포 완료!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 확인사항:" -ForegroundColor Yellow
Write-Host "1. API: http://1.212.201.147:3001" -ForegroundColor White
Write-Host "2. WEB: http://1.212.201.147:3000" -ForegroundColor White
Write-Host "3. Swagger: http://1.212.201.147:3001/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "📝 모니터링 시작:" -ForegroundColor Yellow
Write-Host "ssh $SERVER 'nohup $PROJECT_DIR/scripts/monitor-server.sh > /var/log/monitor.log 2>&1 &'" -ForegroundColor White
Write-Host ""
