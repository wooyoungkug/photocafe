#!/bin/sh
# ============================================================================
# Photocafe ERP API — Docker entrypoint
# ----------------------------------------------------------------------------
# 1. Railway Volume(/app/uploads) 권한을 nestjs:nodejs 로 정렬
# 2. DB_MIGRATE_STRATEGY 환경변수로 마이그레이션 분기
#    - none           (기본) : 실행 안 함
#    - db-push        : prisma db push --accept-data-loss (초기 셋업)
#    - migrate-deploy : prisma migrate deploy (운영 안정화 후 권장)
# 3. su-exec 로 nestjs 권한으로 강하한 뒤 NestJS 실행
# ============================================================================
set -e

# uploads 권한 정리 (Railway Volume 호환)
chown -R nestjs:nodejs /app/uploads 2>/dev/null || true

# DB 마이그레이션 전략 (기본: none)
STRATEGY="${DB_MIGRATE_STRATEGY:-none}"
case "$STRATEGY" in
  db-push)
    echo "[entrypoint] DB_MIGRATE_STRATEGY=db-push -> prisma db push --accept-data-loss"
    su-exec nestjs:nodejs npx prisma db push --accept-data-loss --skip-generate
    ;;
  migrate-deploy)
    echo "[entrypoint] DB_MIGRATE_STRATEGY=migrate-deploy -> prisma migrate deploy"
    su-exec nestjs:nodejs npx prisma migrate deploy
    ;;
  none|"")
    echo "[entrypoint] DB_MIGRATE_STRATEGY=none -> skip migrations"
    ;;
  *)
    echo "[entrypoint] WARN: unknown DB_MIGRATE_STRATEGY='$STRATEGY' -> skip"
    ;;
esac

exec su-exec nestjs:nodejs node dist/main.js
