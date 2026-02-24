#!/bin/bash
# =============================================
# Printing114 ERP - Commit & Push 배포 스크립트
# 로컬에서 실행: commit → push → GitHub Actions 자동 배포
# 사용법:
#   ./push.sh              → 메시지 직접 입력
#   ./push.sh "fix: 버그수정"  → 메시지 인자로 전달
# =============================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Printing114 ERP 배포 스크립트${NC}"
echo -e "${CYAN}  commit → push → GitHub Actions 🚀${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# ── 1. 변경사항 확인 ──────────────────────────
echo -e "${BLUE}[1/4] 변경사항 확인...${NC}"

# uploads, .next, node_modules 제외한 변경 파일
CHANGED=$(git status --short | grep -vE "^(\?\? )?(apps/api/uploads/|apps/web/\.next/|node_modules/)")

if [ -z "$CHANGED" ]; then
  echo -e "${YELLOW}⚠  커밋할 변경사항이 없습니다.${NC}"
  git status --short
  exit 0
fi

echo "변경된 파일:"
echo "$CHANGED" | sed 's/^/  /'
echo ""

# ── 2. 스테이징 (uploads 제외) ────────────────
echo -e "${BLUE}[2/4] 파일 스테이징...${NC}"

# 추적 중인 파일 변경사항 (uploads 제외)
git add -u -- ':!apps/api/uploads/' ':!apps/web/.next/'

# Untracked 새 파일 (uploads, .next, node_modules 제외)
git status --short | grep "^??" | grep -vE "apps/api/uploads/|apps/web/\.next/|node_modules/" | awk '{print $2}' | while read -r f; do
  [ -e "$f" ] && git add "$f"
done

STAGED=$(git diff --cached --name-only)
if [ -z "$STAGED" ]; then
  echo -e "${YELLOW}⚠  스테이징된 파일이 없습니다.${NC}"
  exit 0
fi

echo "스테이징 완료:"
echo "$STAGED" | sed 's/^/  ✓ /'
echo ""

# ── 3. 커밋 메시지 ────────────────────────────
echo -e "${BLUE}[3/4] 커밋 메시지${NC}"

if [ -n "$1" ]; then
  COMMIT_MSG="$1"
  echo "  메시지: $COMMIT_MSG"
else
  DEFAULT_MSG="auto: $(date '+%Y%m%d %H:%M')"
  echo -n "  메시지 입력 [기본값: '${DEFAULT_MSG}']: "
  read -r INPUT_MSG
  COMMIT_MSG="${INPUT_MSG:-$DEFAULT_MSG}"
fi

echo ""
git commit -m "$COMMIT_MSG"
echo ""

# ── 4. Push & 배포 모니터링 ───────────────────
echo -e "${BLUE}[4/4] GitHub push 중...${NC}"
git push origin main

echo ""
echo -e "${GREEN}✅ Push 완료! GitHub Actions 배포 시작됨${NC}"
echo ""
echo -e "  파이프라인: GitHub Actions → Docker 빌드 → GHCR → NAS 재시작"
echo -e "  소요시간:   약 3~5분"
echo ""

# gh CLI 있으면 Actions 상태 확인
if command -v gh &> /dev/null; then
  echo -e "${YELLOW}Actions 시작 대기 중 (5초)...${NC}"
  sleep 5
  echo ""
  echo -e "${BLUE}최신 Actions 실행:${NC}"
  gh run list --limit 3 --workflow=deploy.yml 2>/dev/null || true
  echo ""
  echo -e "${BLUE}실시간 로그 보기:${NC}  gh run watch"
fi

echo ""
echo -e "${CYAN}Actions 페이지: https://github.com/wooyoungkug/photocafe/actions${NC}"
echo -e "${CYAN}운영 서버:      http://1.212.201.147:3000${NC}"
echo ""
