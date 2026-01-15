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
    echo -e "\n${YELLOW}[1/5] Git에서 최신 코드 가져오기...${NC}"
    git pull origin main
else
    echo -e "\n${YELLOW}[1/5] Git 업데이트 건너뜀 (--update 옵션으로 활성화)${NC}"
fi

# 기존 컨테이너 중지
echo -e "\n${YELLOW}[2/5] 기존 컨테이너 중지...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production down || true

# Docker 이미지 빌드
echo -e "\n${YELLOW}[3/5] Docker 이미지 빌드 중...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# 컨테이너 시작
echo -e "\n${YELLOW}[4/5] 컨테이너 시작...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 데이터베이스 마이그레이션 대기
echo -e "\n${YELLOW}[5/5] 데이터베이스 준비 대기...${NC}"
sleep 10

# Prisma 마이그레이션
echo -e "\n${YELLOW}데이터베이스 스키마 적용...${NC}"
docker exec photocafe-api npx prisma db push --skip-generate || {
    echo -e "${RED}마이그레이션 실패. 컨테이너 로그를 확인하세요.${NC}"
    docker-compose -f docker-compose.prod.yml logs api
    exit 1
}

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  배포 완료!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "웹 앱:     http://localhost:3000"
echo -e "API:       http://localhost:3001"
echo -e "API 문서:  http://localhost:3001/api/docs"
echo ""
echo -e "${YELLOW}컨테이너 상태:${NC}"
docker-compose -f docker-compose.prod.yml ps
