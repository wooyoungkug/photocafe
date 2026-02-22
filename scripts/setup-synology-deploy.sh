#!/bin/bash
# ==========================================
# Synology 서버 자동 배포 초기 설정 가이드
# 이 스크립트는 로컬 PC에서 실행합니다
# ==========================================

SERVER_IP="1.212.201.147"
SSH_PORT="22"

echo "======================================="
echo " Synology 자동 배포 설정 가이드"
echo "======================================="
echo ""

# Step 1: SSH 키 생성 (없는 경우)
echo "[Step 1] SSH 키 생성"
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "SSH 키가 없습니다. 생성합니다..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    echo "SSH 키 생성 완료!"
else
    echo "SSH 키가 이미 존재합니다. (Skip)"
fi
echo ""

# Step 2: SSH 키를 Synology 서버에 등록
echo "[Step 2] SSH 키를 Synology 서버에 등록"
echo "아래 명령을 실행하여 공개키를 서버에 등록하세요:"
echo ""
echo "  ssh-copy-id -p $SSH_PORT root@$SERVER_IP"
echo ""
echo "(비밀번호 입력 후 자동 등록됩니다)"
echo ""

# Step 3: GitHub Secrets 설정
echo "[Step 3] GitHub Secrets 설정"
echo "GitHub 레포지토리 Settings > Secrets > Actions 에서 추가:"
echo ""
echo "  SSH_HOST = $SERVER_IP"
echo "  SSH_USER = root"
echo "  SSH_PORT = $SSH_PORT"
echo "  SSH_KEY  = (아래 내용을 복사하여 붙여넣기)"
echo ""
echo "--- SSH Private Key (복사할 내용) ---"
if [ -f ~/.ssh/id_rsa ]; then
    cat ~/.ssh/id_rsa
else
    echo "(SSH 키를 먼저 생성하세요)"
fi
echo "--- 끝 ---"
echo ""

# Step 4: 테스트
echo "[Step 4] SSH 연결 테스트"
echo "  ssh -p $SSH_PORT root@$SERVER_IP 'echo SSH OK'"
echo ""

echo "======================================="
echo " 설정 완료 후:"
echo " git push 하면 자동으로 배포됩니다!"
echo "======================================="
