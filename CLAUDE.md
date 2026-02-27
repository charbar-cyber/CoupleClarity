# CoupleClarity — Project Instructions

## Overview
Relationship coaching web app with AI-powered communication tools. Monorepo: React frontend + Express backend + shared schema.

## Architecture
- **Frontend:** React 18 + TypeScript + Tailwind + shadcn/ui + Wouter router + TanStack Query
- **Backend:** Express 4 + TypeScript + Passport.js (session auth, scrypt passwords)
- **AI:** OpenAI GPT-4o + Anthropic Claude Sonnet 4.6 (user-selectable per account)
- **Real-time:** WebSocket (ws) for partner notifications
- **Storage:** In-memory (`MemStorage` class in `server/storage.ts`). Schema defined via Drizzle ORM + Zod in `shared/schema.ts` — ready for PostgreSQL but not wired up yet.
- **Testing:** Vitest + Supertest

## Key Paths
```
client/src/pages/         # Route pages
client/src/components/    # UI components
client/src/lib/queryClient.ts  # API client (adds X-Requested-With CSRF header)
server/routes.ts          # Thin orchestrator — WebSocket + delegates to route modules
server/routes/            # 10 domain modules (emotions, partnerships, exercises, etc.)
server/routes/types.ts    # Shared RouteContext, re-exports isAuthenticated from auth.ts
server/auth.ts            # Passport config, password hashing, rate limiters, isAuthenticated
server/openai.ts          # OpenAI integration (conditional init, safeParseJSON helper)
server/anthropic.ts       # Anthropic integration (conditional init)
server/storage.ts         # MemStorage implements IStorage interface (~2200 lines)
shared/schema.ts          # Drizzle tables + Zod schemas (27+ tables)
```

## Commands
```bash
npm run dev      # Start dev server on port 5000
npm run build    # Vite (client) + esbuild (server) → dist/
npm run start    # Production: NODE_ENV=production node dist/index.js
npm run test     # Vitest (auth + CSRF tests)
npm run check    # tsc --noEmit
```

## Conventions
- Port 5000 always — serves both API and client
- All state-changing `/api` requests require either `Content-Type: application/json`, `X-Requested-With: CoupleClarity`, or `multipart/form-data` (CSRF protection in `server/index.ts`)
- `isAuthenticated` middleware lives in `server/auth.ts` only — route modules import via `server/routes/types.ts` re-export
- AI clients are conditionally initialized — both `openai` and `anthropic` can be `null`. Every exported AI function has a null guard returning sensible defaults.
- Route modules export `register*(app, ctx)` or `register(app, ctx)` where `ctx: RouteContext = { clients, sendNotification }`
- Rate limiting: `authLimiter` (15 req / 15 min) on login/register, `passwordResetLimiter` (5 req / hour) on forgot-password
- `SESSION_SECRET` required in production (server crashes on startup without it)

## Known Pre-existing Type Errors
These exist in the codebase and are NOT caused by our changes:
- `server/storage.ts` — 3 errors (type mismatches on journal/exercise/emotion return types)
- `server/vite.ts` — 1 error (`allowedHosts` type mismatch with Vite 5)
- Several client component errors (non-blocking, app runs fine)

## Deployment
- **Repo:** https://github.com/charbar-cyber/CoupleClarity
- **Domain:** coupleclarity.com (GoDaddy)
- **Target host:** Render (free tier) — config in `render.yaml`
- DNS not yet pointed — needs A record + CNAME configured on GoDaddy after Render deploy

## What NOT to Do
- Don't add `DATABASE_URL` or wire up Drizzle to Postgres without explicit request
- Don't change OpenAI model from `gpt-4o` or Anthropic from `claude-sonnet-4-6` unless asked
- Don't remove the in-memory storage — it's intentional for zero-config local dev
- Don't skip the CSRF header in new API calls from the client
