#!/bin/bash

# ==========================================
# 운영 서버 자동 배포 스크립트
# ==========================================

set -e  # 에러 발생 시 중단

SERVER="root@1.212.201.147"
PROJECT_DIR="/volume1/docker/printing114"

echo "=========================================="
echo "🚀 Printing114 운영 서버 배포 시작"
echo "=========================================="

# 1. 코드 업데이트
echo ""
echo "📥 1단계: 코드 업데이트"
ssh $SERVER "cd $PROJECT_DIR && git pull origin main"

# 2. .env 파일 확인
echo ""
echo "📝 2단계: .env 파일 확인"
echo "⚠️  .env.production 파일에 다음 내용이 있는지 확인하세요:"
echo "DATABASE_URL에 커넥션 풀 파라미터:"
echo "?connection_limit=30&pool_timeout=20&connect_timeout=10"
echo ""
read -p "✅ .env 파일 확인 완료? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 배포 중단. .env 파일을 먼저 확인하세요."
    exit 1
fi

# 3. Docker 재빌드 및 재시작
echo ""
echo "🐳 3단계: Docker 재시작"
echo "컨테이너를 중지합니다..."
ssh $SERVER "cd $PROJECT_DIR && sudo docker-compose -f docker-compose.prod.yml down"

echo "새 이미지를 빌드하고 시작합니다..."
ssh $SERVER "cd $PROJECT_DIR && sudo docker-compose -f docker-compose.prod.yml up -d --build"

# 4. 시작 대기
echo ""
echo "⏳ 4단계: 서버 시작 대기 (40초)..."
sleep 40

# 5. 상태 확인
echo ""
echo "🔍 5단계: 상태 확인"
echo "--- Docker 컨테이너 상태 ---"
ssh $SERVER "sudo docker ps --filter 'name=photocafe' --format 'table {{.Names}}\t{{.Status}}'"

echo ""
echo "--- API 로그 (최근 20줄) ---"
ssh $SERVER "sudo docker logs photocafe-api --tail 20"

# 6. Health Check
echo ""
echo "💚 6단계: Health Check"
echo "API Health:"
ssh $SERVER "curl -s http://localhost:3001/health | jq ."

echo ""
echo "DB Health:"
ssh $SERVER "curl -s http://localhost:3001/health/db | jq ."

# 7. 외부 접속 확인
echo ""
echo "🌐 7단계: 외부 접속 확인"
echo "API Health (외부):"
curl -s http://1.212.201.147:3001/health | jq .

echo ""
echo "=========================================="
echo "✅ 배포 완료!"
echo "=========================================="
echo ""
echo "📊 확인사항:"
echo "1. API: http://1.212.201.147:3001"
echo "2. WEB: http://1.212.201.147:3000"
echo "3. Swagger: http://1.212.201.147:3001/api/docs"
echo ""
echo "📝 모니터링 시작:"
echo "nohup $PROJECT_DIR/scripts/monitor-server.sh > /var/log/monitor.log 2>&1 &"
echo ""
