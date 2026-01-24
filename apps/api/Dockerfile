# ================================
# Stage 1: Dependencies & Build
# ================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files (build context is repo root)
COPY apps/api/package.json ./
COPY apps/api/prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api/src ./src
COPY apps/api/tsconfig*.json ./
COPY apps/api/nest-cli.json ./

# Generate Prisma client and build
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
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
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]
