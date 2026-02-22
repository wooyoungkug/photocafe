#!/bin/bash
# PhotoCafe ERP - 시놀로지 배포 스크립트

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  PhotoCafe ERP 배포 시작${NC}"
echo -e "${GREEN}========================================${NC}"

# 환경 변수 파일 확인
if [ ! -f ".env.production" ]; then
    echo -e "${RED}오류: .env.production 파일이 없습니다.${NC}"
    echo -e "${YELLOW}.env.production.example을 복사하여 설정해주세요:${NC}"
    echo "  cp .env.production.example .env.production"
    exit 1
fi

# Git 업데이트 (선택적)
if [ "$1" = "--update" ] || [ "$1" = "-u" ]; then
    echo -e "\n${YELLOW}[1/6] Git에서 최신 코드 가져오기...${NC}"
    git pull origin main
else
    echo -e "\n${YELLOW}[1/6] Git 업데이트 건너뜀 (--update 옵션으로 활성화)${NC}"
fi

# 네트워크 & DB 점검
echo -e "\n${YELLOW}[2/6] 네트워크 & DB 점검...${NC}"
docker network create photocafe-network 2>/dev/null && echo "네트워크 생성됨" || echo "네트워크 이미 존재"
if docker inspect photocafe-db > /dev/null 2>&1; then
    docker network connect --alias postgres photocafe-network photocafe-db 2>/dev/null || true
    echo -e "DB 상태: $(docker inspect --format='{{.State.Status}}' photocafe-db)"
else
    echo -e "${RED}오류: photocafe-db 컨테이너가 없습니다.${NC}"
    echo -e "${YELLOW}DB를 먼저 시작하세요:${NC}"
    echo "  docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres"
    exit 1
fi

# Docker 이미지 빌드 (api + web만, DB 제외)
echo -e "\n${YELLOW}[3/6] Docker 이미지 빌드 중 (api + web)...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache api web

# 컨테이너 시작 (DB 제외)
echo -e "\n${YELLOW}[4/6] 컨테이너 시작 (api + web)...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps api web

# 시작 대기
echo -e "\n${YELLOW}[5/6] 서버 시작 대기...${NC}"
for i in $(seq 1 24); do
    sleep 5
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}API 서버 준비 완료! ($((i*5))초)${NC}"
        break
    fi
    echo "대기 중... ($((i*5))초)"
    if [ "$i" = "24" ]; then
        echo -e "${RED}API 시작 타임아웃. 로그:${NC}"
        docker-compose -f docker-compose.prod.yml logs --tail 30 api
        exit 1
    fi
done

# 상태 확인
echo -e "\n${YELLOW}[6/6] 최종 상태 확인...${NC}"
docker ps --filter 'name=photocafe' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  배포 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "웹 앱:     http://localhost:3000"
echo -e "API:       http://localhost:3001"
echo -e "API 문서:  http://localhost:3001/api/docs"
