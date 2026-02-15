#!/bin/bash

# ==========================================
# GitHub Actions용 Synology SSH 키 설정 가이드
# ==========================================
# 이 스크립트를 로컬 PC에서 실행하여 SSH 키를 생성하고
# GitHub Secrets에 등록하는 과정을 안내합니다.

set -e

SYNOLOGY_HOST="${1:-1.212.201.147}"
SYNOLOGY_USER="${2:-root}"
KEY_FILE="$HOME/.ssh/synology_deploy_key"

echo "==========================================="
echo " Synology NAS SSH 키 설정"
echo "==========================================="
echo ""
echo "대상: $SYNOLOGY_USER@$SYNOLOGY_HOST"
echo ""

# 1. SSH 키 생성
if [ -f "$KEY_FILE" ]; then
    echo "[1/4] SSH 키가 이미 존재합니다: $KEY_FILE"
else
    echo "[1/4] SSH 키 생성 중..."
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$KEY_FILE" -N ""
    echo "  생성 완료: $KEY_FILE"
fi

# 2. Synology에 공개키 등록
echo ""
echo "[2/4] Synology에 공개키 등록..."
echo "  다음 명령어를 실행하세요:"
echo ""
echo "  ssh-copy-id -i ${KEY_FILE}.pub ${SYNOLOGY_USER}@${SYNOLOGY_HOST}"
echo ""
echo "  또는 수동으로:"
echo "  cat ${KEY_FILE}.pub | ssh ${SYNOLOGY_USER}@${SYNOLOGY_HOST} 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'"
echo ""

# 3. GitHub Secrets 등록 안내
echo "[3/4] GitHub Secrets 등록"
echo "  GitHub 리포지토리 > Settings > Secrets and variables > Actions"
echo "  다음 4개의 Secret을 추가하세요:"
echo ""
echo "  SYNOLOGY_HOST = $SYNOLOGY_HOST"
echo "  SYNOLOGY_USER = $SYNOLOGY_USER"
echo "  SYNOLOGY_PORT = 22"
echo "  SYNOLOGY_SSH_KEY = (아래 내용 전체 복사)"
echo ""
echo "--- SSH Private Key (이 내용을 SYNOLOGY_SSH_KEY에 등록) ---"
cat "$KEY_FILE"
echo "--- 여기까지 ---"
echo ""

# 4. 연결 테스트
echo "[4/4] SSH 연결 테스트"
echo "  다음 명령어로 테스트하세요:"
echo ""
echo "  ssh -i $KEY_FILE ${SYNOLOGY_USER}@${SYNOLOGY_HOST} 'echo SSH 연결 성공!'"
echo ""
echo "==========================================="
echo " 설정 완료 후 main 브랜치에 push하면 자동 배포됩니다!"
echo "==========================================="
