#!/bin/bash

# ==========================================
# 서버 모니터링 스크립트
# 30초마다 서버 상태 체크, 다운되면 자동 재시작
# ==========================================

API_URL="http://1.212.201.147:3001/health"
WEB_URL="http://1.212.201.147:3000"
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"  # 텔레그램 봇 토큰 (선택)
TELEGRAM_CHAT_ID="YOUR_CHAT_ID"      # 텔레그램 채팅 ID (선택)
CHECK_INTERVAL=30
MAX_RETRIES=3

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"
}

# 텔레그램 알림 전송 (선택)
send_telegram() {
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TELEGRAM_CHAT_ID}" \
      -d text="🚨 Printing114 서버 알림: $1" > /dev/null
  fi
}

# 서버 헬스체크
check_health() {
  local url=$1
  local name=$2
  local retry_count=0

  while [ $retry_count -lt $MAX_RETRIES ]; do
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url")

    if [ "$response" = "200" ]; then
      log "$name is healthy ✅"
      return 0
    else
      retry_count=$((retry_count + 1))
      warn "$name check failed (attempt $retry_count/$MAX_RETRIES): HTTP $response"
      sleep 5
    fi
  done

  error "$name is DOWN after $MAX_RETRIES attempts! 🔴"
  return 1
}

# Docker 컨테이너 재시작
restart_container() {
  local container_name=$1

  error "Restarting $container_name..."
  send_telegram "$container_name 재시작 시도"

  ssh root@1.212.201.147 "sudo docker restart $container_name"

  if [ $? -eq 0 ]; then
    log "$container_name restarted successfully ✅"
    send_telegram "$container_name 재시작 완료"
    sleep 30  # 서버 시작 대기
  else
    error "Failed to restart $container_name ❌"
    send_telegram "$container_name 재시작 실패!"
  fi
}

# 메인 모니터링 루프
log "==========================================  "
log "Printing114 서버 모니터링 시작"
log "API: $API_URL"
log "WEB: $WEB_URL"
log "체크 주기: ${CHECK_INTERVAL}초"
log "=========================================="

while true; do
  # API 서버 체크
  if ! check_health "$API_URL" "API Server"; then
    restart_container "printing114-api"
  fi

  sleep 5

  # WEB 서버 체크
  if ! check_health "$WEB_URL" "WEB Server"; then
    restart_container "printing114-web"
  fi

  # Docker 컨테이너 상태 출력
  log "Docker 상태:"
  ssh root@1.212.201.147 "sudo docker ps --filter 'name=printing114' --format 'table {{.Names}}\t{{.Status}}\t{{.RunningFor}}'"

  # 메모리 사용량 체크
  log "메모리 사용량:"
  ssh root@1.212.201.147 "sudo docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}' printing114-api printing114-web"

  sleep $CHECK_INTERVAL
done
