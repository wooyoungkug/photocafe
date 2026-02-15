#!/bin/bash

# ==========================================
# Synology NAS 롤백 스크립트
# ==========================================
# 배포 후 문제 발생 시 이전 커밋으로 롤백
# 사용법: ./scripts/synology-rollback.sh [커밋해시]
#
# 예시:
#   ./scripts/synology-rollback.sh           # 1개 전 커밋으로 롤백
#   ./scripts/synology-rollback.sh abc1234   # 특정 커밋으로 롤백

set -euo pipefail

PROJECT_DIR="/volume1/docker/printing114"
COMPOSE_FILE="docker-compose.prod.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR: $1${NC}"; exit 1; }

cd "$PROJECT_DIR" || error "프로젝트 디렉토리를 찾을 수 없습니다"

CURRENT_COMMIT=$(git rev-parse --short HEAD)
TARGET_COMMIT="${1:-}"

echo ""
echo "==========================================="
log "Printing114 롤백"
echo "==========================================="

# 최근 커밋 목록 표시
log "최근 배포 이력:"
git log --oneline -10
echo ""

if [ -z "$TARGET_COMMIT" ]; then
    TARGET_COMMIT=$(git rev-parse --short HEAD~1)
    log "대상 미지정 -> 1개 전 커밋으로 롤백: $TARGET_COMMIT"
fi

log "현재: $CURRENT_COMMIT -> 롤백 대상: $TARGET_COMMIT"
echo ""

read -p "롤백을 진행하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "롤백 취소됨."
    exit 0
fi

# 1. 롤백
log "[1/4] 커밋 롤백..."
git checkout "$TARGET_COMMIT" -- .
success "  롤백 완료: $TARGET_COMMIT"

# 2. Docker 재빌드
log "[2/4] Docker 재빌드..."
docker compose -f "$COMPOSE_FILE" build --no-cache api web
docker compose -f "$COMPOSE_FILE" up -d
success "  Docker 재시작 완료"

# 3. 대기
log "[3/4] 서비스 시작 대기 (45초)..."
sleep 45

# 4. Health Check
log "[4/4] Health Check..."
API_OK=false
WEB_OK=false

for i in 1 2 3; do
    curl -sf http://localhost:3001/health > /dev/null 2>&1 && API_OK=true && break
    sleep 10
done

for i in 1 2 3; do
    curl -sf http://localhost:3000 > /dev/null 2>&1 && WEB_OK=true && break
    sleep 10
done

echo "==========================================="
docker ps --filter 'name=photocafe' --format 'table {{.Names}}\t{{.Status}}'
echo "==========================================="

if [ "$API_OK" = true ] && [ "$WEB_OK" = true ]; then
    success "롤백 성공!"
    success "  $CURRENT_COMMIT -> $TARGET_COMMIT"
else
    error "롤백 후 서비스 확인 필요 (API: $API_OK / Web: $WEB_OK)"
fi

echo ""
