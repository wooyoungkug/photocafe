# ================================
# Stage 1: Dependencies & Build
# ================================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy package files (when build context is apps/web)
COPY package.json ./

# Install dependencies and upgrade next to fix security vulnerabilities
RUN npm install && npm install next@15.5.9

# Copy source code
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
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

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
