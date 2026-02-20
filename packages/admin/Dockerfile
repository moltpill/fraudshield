# FraudShield Admin - Dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/admin/package.json ./packages/admin/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/api/prisma ./packages/api/prisma
COPY packages/admin ./packages/admin

RUN pnpm --filter @fraudshield/shared build
RUN pnpm --filter @fraudshield/admin db:generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @fraudshield/admin build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/admin/.next/standalone ./
COPY --from=builder /app/packages/admin/.next/static ./packages/admin/.next/static
COPY --from=builder /app/packages/admin/public ./packages/admin/public

USER nextjs

WORKDIR /app/packages/admin

EXPOSE 3003

ENV PORT=3003
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3003/api/health || exit 1
