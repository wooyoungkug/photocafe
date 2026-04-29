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
RUN printf '#!/bin/sh\nset -e\nchown -R nestjs:nodejs /app/uploads 2>/dev/null || true\nexec su-exec nestjs:nodejs node dist/main.js\n' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# 의도적으로 USER 지정 안 함 — 시작 시 root 로 chown 후 entrypoint 가 nestjs 로 강하한다.

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 서버 시작 (prisma db push는 배포 스크립트에서 1회 실행 - 컨테이너 재시작마다 실행 방지)
CMD ["/app/entrypoint.sh"]
