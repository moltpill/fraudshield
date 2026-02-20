# FraudShield Dashboard - Dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/dashboard/package.json ./packages/dashboard/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/api/prisma ./packages/api/prisma
COPY packages/dashboard ./packages/dashboard

# Build shared
RUN pnpm --filter @fraudshield/shared build

# Generate Prisma client for dashboard
RUN pnpm --filter @fraudshield/dashboard db:generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @fraudshield/dashboard build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/dashboard/.next/standalone ./
COPY --from=builder /app/packages/dashboard/.next/static ./packages/dashboard/.next/static
COPY --from=builder /app/packages/dashboard/public ./packages/dashboard/public

USER nextjs

WORKDIR /app/packages/dashboard

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/api/health || exit 1
