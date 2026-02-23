#!/bin/bash
# ============================================
# Printing114 운영서버 배포 스크립트
# ============================================
# 사용법:
#   ./deploy.sh          → 전체 배포 (API + Web)
#   ./deploy.sh api      → API만 배포
#   ./deploy.sh web      → Web만 배포
#   ./deploy.sh --no-pull → git pull 없이 빌드만
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[배포]${NC} $1"; }
success() { echo -e "${GREEN}[완료]${NC} $1"; }
warn() { echo -e "${YELLOW}[주의]${NC} $1"; }
fail() { echo -e "${RED}[오류]${NC} $1"; exit 1; }

# 옵션 파싱
TARGET="all"
DO_PULL=true

for arg in "$@"; do
    case "$arg" in
        api)       TARGET="api" ;;
        web)       TARGET="web" ;;
        all)       TARGET="all" ;;
        --no-pull) DO_PULL=false ;;
        -h|--help)
            echo "사용법: ./deploy.sh [all|api|web] [--no-pull]"
            echo ""
            echo "  all        API + Web 전체 배포 (기본)"
            echo "  api        API만 배포"
            echo "  web        Web만 배포"
            echo "  --no-pull  git pull 건너뛰기"
            exit 0
            ;;
        *) warn "알 수 없는 옵션: $arg (무시)" ;;
    esac
done

COMPOSE="docker-compose -f docker-compose.prod.yml --env-file .env.production"

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Printing114 배포 시작${NC}"
echo -e "${GREEN}  대상: ${YELLOW}${TARGET}${GREEN}  |  git pull: ${YELLOW}${DO_PULL}${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

# ============================================
# 1. 환경 확인
# ============================================
if [ ! -f ".env.production" ]; then
    fail ".env.production 파일이 없습니다. .env.production.example을 복사하세요."
fi

log "현재 브랜치: $(git branch --show-current)"
log "현재 커밋: $(git log --oneline -1)"

# ============================================
# 2. Git Pull
# ============================================
if [ "$DO_PULL" = true ]; then
    log "[1/5] 최신 코드 가져오는 중..."
    git pull origin main || fail "git pull 실패! 충돌을 확인하세요."
    success "git pull 완료 → $(git log --oneline -1)"
else
    warn "[1/5] git pull 건너뜀 (--no-pull)"
fi

# ============================================
# 3. 네트워크 & DB 확인
# ============================================
log "[2/5] 네트워크 & DB 확인..."
docker network create photocafe-network 2>/dev/null && echo "  네트워크 생성됨" || echo "  네트워크 존재 확인"

if docker inspect photocafe-db > /dev/null 2>&1; then
    docker network connect --alias postgres photocafe-network photocafe-db 2>/dev/null || true
    DB_STATUS=$(docker inspect --format='{{.State.Status}}' photocafe-db)
    log "DB 상태: $DB_STATUS"
    if [ "$DB_STATUS" != "running" ]; then
        fail "DB가 실행중이 아닙니다! docker start photocafe-db 실행 후 재시도하세요."
    fi
else
    fail "photocafe-db 컨테이너가 없습니다."
fi

# ============================================
# 4. Docker 빌드 & 재시작
# ============================================
case "$TARGET" in
    api)
        log "[3/5] API 이미지 빌드 중..."
        $COMPOSE build api
        log "[4/5] API 컨테이너 재시작..."
        $COMPOSE up -d --no-deps api
        ;;
    web)
        log "[3/5] Web 이미지 빌드 중..."
        $COMPOSE build web
        log "[4/5] Web 컨테이너 재시작..."
        $COMPOSE up -d --no-deps web
        ;;
    all)
        log "[3/5] API + Web 이미지 빌드 중..."
        $COMPOSE build api web
        log "[4/5] 컨테이너 재시작..."
        $COMPOSE up -d --no-deps api web
        ;;
esac

# ============================================
# 5. 헬스체크 대기
# ============================================
log "[5/5] 서버 시작 대기 중..."

# API 헬스체크
if [ "$TARGET" = "api" ] || [ "$TARGET" = "all" ]; then
    echo -n "  API: "
    for i in $(seq 1 24); do
        sleep 5
        if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
            echo -e "${GREEN}정상 ($((i*5))초)${NC}"
            break
        fi
        echo -n "."
        if [ "$i" = "24" ]; then
            echo -e "${RED}타임아웃!${NC}"
            warn "API 로그 확인: docker logs photocafe-api --tail 50"
        fi
    done
fi

# Web 헬스체크
if [ "$TARGET" = "web" ] || [ "$TARGET" = "all" ]; then
    echo -n "  Web: "
    for i in $(seq 1 12); do
        sleep 5
        if curl -sf http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}정상 ($((i*5))초)${NC}"
            break
        fi
        echo -n "."
        if [ "$i" = "12" ]; then
            echo -e "${RED}타임아웃!${NC}"
            warn "Web 로그 확인: docker logs photocafe-web --tail 50"
        fi
    done
fi

# ============================================
# 최종 결과
# ============================================
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  배포 완료!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""

docker ps --filter 'name=photocafe' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo ""
echo -e "  웹:       http://1.212.201.147:3000"
echo -e "  API:      http://1.212.201.147:3001"
echo -e "  API 문서: http://1.212.201.147:3001/api/docs"
echo ""
warn "문제 시 로그: docker logs photocafe-api --tail 50"
warn "          docker logs photocafe-web --tail 50"
