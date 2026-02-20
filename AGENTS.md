# Project Conventions — Sentinel

## Stack
- **Monorepo**: pnpm workspaces
- **SDK**: TypeScript + Rollup (browser bundle)
- **API**: Hono (Node.js)
- **Dashboard**: Next.js 15 + App Router + shadcn/ui
- **Admin**: Next.js 15 + App Router + shadcn/ui
- **Database**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Testing**: Vitest
- **Auth**: next-auth (credentials provider)

## Package Structure
```
packages/
├── shared/      # Types, utilities, shared code
├── sdk/         # Client-side fingerprinting SDK
├── api/         # Hono backend API
├── dashboard/   # Customer dashboard (Next.js)
└── admin/       # Super admin panel (Next.js)
```

## Patterns

### API Routes
- Use Hono middleware for auth and rate limiting
- All routes return JSON
- Error responses: `{ error: string, code: string }`
- Success responses include relevant data

### Database
- Prisma schema in packages/api/prisma/
- Run `pnpm db:generate` after schema changes
- Run `pnpm db:push` to sync schema

### SDK
- Must be <10KB minified
- All fingerprinting runs client-side
- Server does hashing and detection
- Always requires API key

### Types
- Shared types in packages/shared/src/types/
- Import types: `import type { Account } from '@sentinel/shared'`

## Utilities

### API Key Generation
- `generateApiKey('live' | 'test')` in packages/shared
- Format: `fs_live_` or `fs_test_` + 32 hex chars

## Gotchas
- SDK endpoint cannot be overridden (closed core)
- Customer dashboard on port 3002, admin on 3003, API on 3001
- Always validate API key server-side
- Usage tracking must be atomic (race conditions)
