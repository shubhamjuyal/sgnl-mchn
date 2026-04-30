# Signal Machine

Internal radar for Oriental Gem Co. Detects retailer buying signals across Instagram, retailer websites, and manual entry. Scores them, applies guardrails, assigns confidence tiers, and routes the strongest opportunities for human-approved B2B outreach.

See [design.md](design.md) for the full HLD. **Stages 1–5 only**; the Learning Loop (Stage 6) is out of MVP scope.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Web**: Next.js 15 (App Router), Tailwind, shadcn/ui
- **API**: Hono on Node 22
- **DB**: Postgres 16 + Drizzle ORM (TS owns migrations)
- **Queue**: Postgres-native (`job` table, SKIP LOCKED) — produced by TS, consumed by Python workers
- **Workers**: Python 3.12 (detection, scoring, routing, apify, playwright)
- **LLM**: OpenAI GPT (optional second-pass detection)
- **Local infra**: Docker Compose

## Layout

```
apps/
  web/                Next.js admin webapp
  api/                Hono API server
workers/
  detection/          Phrase + LLM detection
  scoring/            Guardrails + decay + score + aggregator
  routing/            Routing rules + queue dispatch
  apify/              Instagram via Apify (stub)
  playwright/         Per-site retailer scrapers (stub)
  shared/             Python lib: db client, bus, signal_id
packages/
  db/                 Drizzle schema, migrations, client
  bus/                JobBus interface + Postgres impl
  blob/               BlobStore interface + disk impl
  config-defaults/    Seed JSONs (13 signals, 14 GRs, 12 archetypes, 9 programs, routing rules)
  shared-types/       Zod schemas + TS types shared web/api
infra/
  docker-compose.yml
  Dockerfile.*
scripts/
  seed.ts             Loads config-defaults into DB
```

## Quick start

```bash
# Prereqs: Node 22, pnpm 9, Python 3.12, Docker
cp .env.example .env
pnpm install

# Bring up postgres
docker compose -f infra/docker-compose.yml up -d postgres

# Apply schema + seed defaults
pnpm db:push     # first-time: pushes Drizzle schema directly to DB
pnpm seed        # loads 13 signals, 14 GRs, 12 archetypes, 9 programs, sample accounts

# Run web + api
pnpm dev

# In another terminal: Python workers
cd workers && uv sync
uv run python -m detection.main &
uv run python -m scoring.main &
uv run python -m routing.main &
```

Open http://localhost:3000.

## End-to-end smoke test

1. `/sources` — confirm 3 sources seeded (instagram, website, manual).
2. `/accounts` — bulk import retailers (or use the seeded sample accounts).
3. `/manual-entry` — log a V1 signal against a known account.
4. `/signals` — within seconds, see new row with `SIG-YYYYMMDD-NNN` and non-zero score.
5. `/routing` — high-score V1 lands in B2B Outreach queue.

## Notes

- HLD called for `pg-boss`; replaced with a custom Postgres queue (`job` table, SKIP LOCKED) for cleaner Python interop. Same semantics, simpler boundary.
- Apify and Playwright workers are scaffolded but not wired to live integrations. The manual entry path proves the pipeline; live scrapers slot into the same job graph when ready.
- Stage 5 destinations Design Whisperer / Phantom Testing are logged in `routing_log` but no downstream worker consumes them yet (deferred per HLD non-goals).
