# ─────────────────────────────────────────────────────────────────────────────
# SolarShare Frontend — Production Docker Image
#
# Build: docker build -t solarshare-frontend:latest .
# Run:   docker run -p 3000:3000 solarshare-frontend:latest
#
# Security:
#   - Runs as non-root user (nextjs, uid=1001)
#   - Read-only filesystem where possible
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
# Build-time env vars (non-secret, public keys only)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_SEPOLIA_RPC
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_SEPOLIA_RPC=$NEXT_PUBLIC_BASE_SEPOLIA_RPC
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
