#!/bin/bash
# ==========================================
# 실시간 자동 커밋+푸시 (파일 변경 감지)
# 10초마다 변경사항 확인 후 자동 커밋+푸시
# 사용법: bash scripts/auto-commit-watch.sh
# ==========================================

REPO_DIR="c:/dev/printing114"
INTERVAL=10  # 체크 간격 (초)
LOG_FILE="$REPO_DIR/scripts/auto-commit.log"

cd "$REPO_DIR" || exit 1

echo "======================================="
echo " Auto Commit Watcher Started"
echo " Checking every ${INTERVAL}s..."
echo " Press Ctrl+C to stop"
echo "======================================="

while true; do
    # 변경사항 확인
    changes=$(git status --porcelain 2>/dev/null)

    if [ -n "$changes" ]; then
        timestamp=$(date +"%Y%m%d %H:%M")
        file_count=$(echo "$changes" | wc -l | tr -d ' ')

        # 스테이징 + 커밋
        git add -A
        git commit -m "auto: $timestamp" --quiet

        # 푸시
        if git push --quiet 2>/dev/null; then
            echo "[$timestamp] Pushed ($file_count files)"
            echo "[$timestamp] Pushed ($file_count files)" >> "$LOG_FILE"
        else
            echo "[$timestamp] Push failed - will retry"
            echo "[$timestamp] Push failed" >> "$LOG_FILE"
        fi
    fi

    sleep $INTERVAL
done
