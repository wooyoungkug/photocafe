#!/bin/bash

# ==========================================
# Synology NAS 로컬 배포 스크립트
# ==========================================
# Synology NAS에서 직접 실행하는 배포 스크립트
# 사용법: ./scripts/synology-deploy.sh [all|api|web]
#
# cron 등록 예시 (5분마다 자동 pull & 배포):
#   */5 * * * * /volume1/docker/printing114/scripts/synology-deploy.sh auto >> /var/log/photocafe-deploy.log 2>&1

set -euo pipefail

# ── 설정 ──
PROJECT_DIR="/volume1/docker/printing114"
COMPOSE_FILE="docker-compose.prod.yml"
BRANCH="main"
LOG_FILE="/var/log/photocafe-deploy.log"
LOCK_FILE="/tmp/photocafe-deploy.lock"

# ── 색상 (터미널 출력용) ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── 함수 ──
log() { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ERROR: $1${NC}"; exit 1; }

# ── 락 파일 (중복 실행 방지) ──
cleanup() { rm -f "$LOCK_FILE"; }
trap cleanup EXIT

if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "배포가 이미 진행 중입니다 (PID: $PID)"
        exit 0
    fi
    rm -f "$LOCK_FILE"
fi
echo $$ > "$LOCK_FILE"

# ── 인자 파싱 ──
DEPLOY_TARGET="${1:-all}"

# ── 메인 ──
cd "$PROJECT_DIR" || error "프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR"

echo ""
echo "==========================================="
log "Printing114 Synology 배포"
log "대상: $DEPLOY_TARGET"
echo "==========================================="

# 자동 모드: 변경사항 있을 때만 배포
if [ "$DEPLOY_TARGET" = "auto" ]; then
    log "자동 모드: 변경사항 확인 중..."
    git fetch origin "$BRANCH" --quiet

    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse "origin/$BRANCH")

    if [ "$LOCAL" = "$REMOTE" ]; then
        log "변경사항 없음. 배포 건너뜀."
        exit 0
    fi

    log "새 커밋 감지! 배포를 시작합니다."
    DEPLOY_TARGET="all"
fi

# 1. Git Pull
log "[1/5] 코드 업데이트..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
success "  코드 업데이트 완료 ($(git rev-parse --short HEAD))"

# 2. Docker 빌드
log "[2/5] Docker 빌드 시작..."
case "$DEPLOY_TARGET" in
    api)
        log "  API만 빌드..."
        docker compose -f "$COMPOSE_FILE" build --no-cache api
        docker compose -f "$COMPOSE_FILE" up -d api
        ;;
    web)
        log "  Web만 빌드..."
        docker compose -f "$COMPOSE_FILE" build --no-cache web
        docker compose -f "$COMPOSE_FILE" up -d web
        ;;
    all)
        log "  전체 빌드..."
        docker compose -f "$COMPOSE_FILE" build --no-cache api web
        docker compose -f "$COMPOSE_FILE" up -d
        ;;
    *)
        error "알 수 없는 배포 대상: $DEPLOY_TARGET (all|api|web|auto)"
        ;;
esac
success "  Docker 빌드 완료"

# 3. 시작 대기
log "[3/5] 서비스 시작 대기..."
sleep 45

# 4. Health Check
log "[4/5] Health Check..."
API_STATUS="FAIL"
WEB_STATUS="FAIL"

for i in 1 2 3 4 5; do
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        API_STATUS="OK"
        break
    fi
    log "  API 응답 대기... ($i/5)"
    sleep 10
done

for i in 1 2 3 4 5; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        WEB_STATUS="OK"
        break
    fi
    log "  Web 응답 대기... ($i/5)"
    sleep 10
done

# 5. 결과
log "[5/5] 배포 결과"
echo "==========================================="
docker ps --filter 'name=photocafe' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "==========================================="
echo ""

if [ "$API_STATUS" = "OK" ] && [ "$WEB_STATUS" = "OK" ]; then
    success "배포 성공!"
    success "  API: http://localhost:3001 ($API_STATUS)"
    success "  Web: http://localhost:3000 ($WEB_STATUS)"
    success "  커밋: $(git rev-parse --short HEAD)"
else
    warn "배포 완료 (일부 서비스 확인 필요)"
    warn "  API: $API_STATUS / Web: $WEB_STATUS"
    warn "로그 확인:"
    warn "  docker logs photocafe-api --tail 30"
    warn "  docker logs photocafe-web --tail 30"
    exit 1
fi

# 오래된 이미지 정리
log "사용하지 않는 Docker 이미지 정리..."
docker image prune -f --filter "until=72h" > /dev/null 2>&1 || true

echo ""
