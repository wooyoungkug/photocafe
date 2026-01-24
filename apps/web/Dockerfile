# ================================
# Stage 1: Dependencies & Build
# ================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci --include-workspace-root --workspace=apps/web

# Copy source code
COPY apps/web ./apps/web

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
WORKDIR /app/apps/web
RUN npm run build

# ================================
# Stage 2: Production
# ================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Seoul

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application (monorepo structure)
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
