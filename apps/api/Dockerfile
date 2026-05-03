# ================================
# Stage 1: Dependencies & Build
# ================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files (build context is repo root)
COPY package.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY fonts ./fonts

# Generate Prisma client and build
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npm run build

# ================================
# Stage 2: Production
# ================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Seoul

# Install OpenSSL for Prisma, curl for health checks, su-exec for privilege drop
RUN apk add --no-cache libc6-compat openssl curl su-exec

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/fonts ./fonts

# Create uploads directory
RUN mkdir -p /app/uploads/temp /app/uploads/orders

# Set ownership
RUN chown -R nestjs:nodejs /app

# Entrypoint script:
# Railway Volume 이 /app/uploads 에 마운트되면 root 소유로 시작되므로
# 컨테이너 시작 시점에 nestjs:nodejs 로 chown 후 nestjs 권한으로 node 실행.
# (su-exec 로 PID 1 안 잃고 우아하게 권한 강하)
#
# DB_MIGRATE_STRATEGY 환경변수로 마이그레이션 동작 분기:
#   - none           (기본) : 마이그레이션 실행 안 함 (안전, 수동 운영)
#   - db-push        : prisma db push --accept-data-loss (초기 셋업/스키마 강제 동기화)
#   - migrate-deploy : prisma migrate deploy (운영 안정화 후 권장 — INFRASTRUCTURE.md v1.1)
COPY scripts/docker-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && \
    sed -i 's/\r$//' /app/entrypoint.sh

# 의도적으로 USER 지정 안 함 — 시작 시 root 로 chown 후 entrypoint 가 nestjs 로 강하한다.

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 서버 시작 (DB 마이그레이션은 DB_MIGRATE_STRATEGY 환경변수로 제어)
CMD ["/app/entrypoint.sh"]
