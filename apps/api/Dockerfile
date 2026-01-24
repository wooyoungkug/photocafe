# ================================
# Stage 1: Dependencies & Build
# ================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy all package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install all dependencies
RUN npm ci --include-workspace-root --workspace=apps/api

# Copy source code
COPY apps/api ./apps/api

# Generate Prisma client and build
WORKDIR /app/apps/api
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run db:generate
# Copy generated Prisma client to root node_modules for runtime
RUN cp -r ./node_modules/.prisma /app/node_modules/ 2>/dev/null || true
RUN cp -r ./node_modules/@prisma /app/node_modules/ 2>/dev/null || true
RUN npm run build

# ================================
# Stage 2: Production
# ================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Seoul

# Install OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]
