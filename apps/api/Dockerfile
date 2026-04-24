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

# Install OpenSSL for Prisma and curl for health checks
RUN apk add --no-cache libc6-compat openssl curl

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

USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 서버 시작 (prisma db push는 배포 스크립트에서 1회 실행 - 컨테이너 재시작마다 실행 방지)
CMD ["node", "dist/main.js"]
