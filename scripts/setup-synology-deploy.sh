#!/bin/bash
# ==========================================
# Synology 자동 배포 초기 설정 (Linux/macOS/Git Bash)
# 실행: bash scripts/setup-synology-deploy.sh
# ==========================================

SERVER_IP="1.212.201.147"
SSH_PORT="22"
SSH_USER="root"
SSH_KEY_PATH="$HOME/.ssh/id_ed25519"
REPO_URL="https://github.com/wooyoungkug/photocafe"

echo ""
echo "==========================================="
echo "  Synology 자동 배포 초기 설정"
echo "==========================================="
echo ""

# ---- Step 1: SSH 키 생성 ----
echo "[Step 1/4] SSH 키 확인"

if [ -f "$SSH_KEY_PATH" ]; then
    echo "  SSH 키가 이미 존재합니다: $SSH_KEY_PATH"
else
    # 기존 RSA 키가 있으면 그것을 사용
    if [ -f "$HOME/.ssh/id_rsa" ]; then
        SSH_KEY_PATH="$HOME/.ssh/id_rsa"
        echo "  기존 RSA 키를 사용합니다: $SSH_KEY_PATH"
    else
        echo "  SSH 키를 생성합니다..."
        ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N ""
        echo "  SSH 키 생성 완료!"
    fi
fi
echo ""

# ---- Step 2: SSH 키를 서버에 등록 ----
echo "[Step 2/4] SSH 키를 서버에 등록"
echo "  서버 비밀번호를 입력하면 공개키가 자동 등록됩니다."
echo ""

PUB_KEY_PATH="${SSH_KEY_PATH}.pub"
if [ -f "$PUB_KEY_PATH" ]; then
    echo "  등록할 공개키:"
    echo "  $(cat "$PUB_KEY_PATH")"
    echo ""

    read -p "  서버에 SSH 키를 등록하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ssh-copy-id -p "$SSH_PORT" -i "$PUB_KEY_PATH" "${SSH_USER}@${SERVER_IP}"
        if [ $? -eq 0 ]; then
            echo "  SSH 키 등록 완료!"
        else
            echo "  SSH 키 등록 실패. 수동으로 등록하세요."
        fi
    else
        echo "  건너뜁니다."
    fi
else
    echo "  공개키 파일을 찾을 수 없습니다: $PUB_KEY_PATH"
fi
echo ""

# ---- Step 3: SSH 연결 테스트 ----
echo "[Step 3/4] SSH 연결 테스트"
echo "  비밀번호 없이 접속되는지 확인합니다..."

TEST_RESULT=$(ssh -o BatchMode=yes -o ConnectTimeout=10 -p "$SSH_PORT" "${SSH_USER}@${SERVER_IP}" "echo SSH_OK" 2>&1)

if echo "$TEST_RESULT" | grep -q "SSH_OK"; then
    echo "  SSH 키 인증 성공!"
else
    echo "  SSH 키 인증 실패 (비밀번호가 필요합니다)"
    echo "  Step 2를 다시 시도하거나 수동으로 설정하세요."
fi
echo ""

# ---- Step 4: GitHub Secrets 안내 ----
echo "[Step 4/4] GitHub Secrets 설정"
echo ""
echo "  GitHub 레포지토리에서 아래 Secrets를 등록하세요:"
echo "  ${REPO_URL}/settings/secrets/actions"
echo ""
echo "  ┌─────────────┬──────────────────────────┐"
echo "  │ Secret Name │ Value                    │"
echo "  ├─────────────┼──────────────────────────┤"
echo "  │ SSH_HOST    │ $SERVER_IP          │"
echo "  │ SSH_USER    │ $SSH_USER                   │"
echo "  │ SSH_PORT    │ $SSH_PORT                     │"
echo "  │ SSH_KEY     │ (아래 개인키 내용)        │"
echo "  └─────────────┴──────────────────────────┘"
echo ""

if [ -f "$SSH_KEY_PATH" ]; then
    echo "  SSH_KEY에 넣을 개인키:"
    echo "  ------ 아래 내용 전체를 복사하세요 ------"
    cat "$SSH_KEY_PATH"
    echo "  ------ 여기까지 ------"
fi

echo ""
echo "==========================================="
echo "  설정 완료 후 배포 방법:"
echo "==========================================="
echo ""
echo "  방법 A (GitHub UI):"
echo "    ${REPO_URL}/actions -> 'Deploy to Synology' -> 'Run workflow'"
echo ""
echo "  방법 B (로컬 터미널):"
echo "    npm run deploy"
echo ""
