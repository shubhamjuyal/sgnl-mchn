# sgnl-api-server

Standalone, Vercel-deployable Hono API server. Self-contained — no monorepo workspace dependencies.

## Setup

```bash
pnpm install
cp .env.example .env   # then edit DATABASE_URL
```

## Database

```bash
pnpm db:generate   # generate SQL migrations from src/db/schema.ts
pnpm db:migrate    # apply migrations
pnpm db:seed       # seed dictionary, archetypes, programs, sources, sample accounts
pnpm db:studio     # drizzle studio
```

## Local development

```bash
pnpm dev           # tsx watch on src/server.ts → http://localhost:3001
```

## Deploy to Vercel

```bash
vercel deploy
```

`api/index.ts` exports the Hono app as the default fetch handler. `vercel.json`
rewrites all paths to that single Function.

### Required Vercel env vars

- `DATABASE_URL` — Postgres connection string. **Use a pooled URL** (Neon
  pooler / PgBouncer / Supabase pooler), not the direct connection. Each
  serverless instance opens its own pool, so direct connections will exhaust
  Postgres `max_connections` under load.
- `LOG_LEVEL` (optional) — pino level, default `info`.

## Routes

All routes mirror the original `apps/api` server:

- `GET  /health`
- `*    /ingest/...`
- `*    /sources/...`
- `*    /accounts/...`
- `*    /dictionary/...`
- `*    /signals/...`
- `*    /scores/...`
- `*    /routing/...`
- `*    /guardrails/...`
- `*    /programs/...`

## Notes

- Blob storage is **not** wired in. If added later, use Vercel Blob or S3 —
  local disk does not survive serverless cold starts.
- Background workers (the `workers/` Python services in the original monorepo)
  are out of scope here. The API only enqueues jobs into the Postgres `job`
  table; workers must run on a long-running host elsewhere.
