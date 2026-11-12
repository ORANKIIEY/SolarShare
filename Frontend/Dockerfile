# ─────────────────────────────────────────────────────────────────────────────
# GridGuard AI Frontend — Production Docker Image
# Work Breakdown: Vercel/Netlify → CAE static hosting
#
# Build: docker build -t swr.ap-southeast-3.myhuaweicloud.com/<org>/gridguard-frontend:latest .
# Push:  docker push swr.ap-southeast-3.myhuaweicloud.com/<org>/gridguard-frontend:latest
# Deploy: See Infrastructure/cae-frontend.yaml
#
# Security (Work Breakdown: Zero Trust Architecture):
#   - Runs as non-root user (node, uid=1000)
#   - Read-only filesystem where possible
#   - Huawei WAF sits in front of CAE ELB — no direct internet access to pod
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
ARG NEXT_PUBLIC_HUAWEI_CLIENT_ID
ARG NEXT_PUBLIC_HUAWEI_AUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_HUAWEI_CLIENT_ID=$NEXT_PUBLIC_HUAWEI_CLIENT_ID
ENV NEXT_PUBLIC_HUAWEI_AUTH_URL=$NEXT_PUBLIC_HUAWEI_AUTH_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Non-root user — Work Breakdown: Zero Trust / HSS host security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
