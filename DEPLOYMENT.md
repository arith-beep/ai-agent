# Production deployment: Vercel + Supabase + OpenAI

Minimum architecture for the first live demo. No Redis/worker; URL knowledge
ingestion is disabled (honestly, in the UI) until a queue is added later.

## 1. What you need to provide

- A **Supabase** project (Postgres + pgvector).
- A **Vercel** account, with this repo imported (or a Vercel token if you want
  me to deploy it for you).
- An **OpenAI** API key (chat + embeddings).
- Two generated secrets (commands below).

That's it — everything else below is configuration, not something only you
can decide.

## 2. Supabase setup

1. Create a project at supabase.com.
2. In the SQL editor or via `psql`, nothing manual is needed for the
   `vector` extension — the migration script creates it automatically
   (`CREATE EXTENSION IF NOT EXISTS vector`, see `packages/storage/src/migrate.ts`).
3. Get two connection strings from Project Settings -> Database:
   - **Connection pooling** string (port 6543, "Transaction" mode) — used by
     the deployed app at runtime.
   - **Direct connection** string (port 5432) — used once, locally, to run
     the migration.
4. Run the migration against the **direct** connection:
   ```
   DATABASE_URL="postgres://...:5432/postgres?sslmode=require" pnpm db:migrate
   ```
   This applies all 6 existing Drizzle migrations (`/drizzle`) and creates
   every table the app needs (sales agents, leads, conversations, knowledge,
   tools, etc.) — nothing else to run by hand.
5. For the **deployed app's** `DATABASE_URL` (below), use the **pooled**
   (6543) string with `?sslmode=require&pgbouncer=true` appended. The app
   already sets `prepare: false` on its Postgres client (`packages/storage/src/db.ts`),
   which is required for Supabase's transaction-mode pooler.

## 3. Vercel project settings

- **Root Directory**: `apps/web` (this is a pnpm/Turborepo monorepo; Vercel
  auto-detects the workspace and installs from the repo root).
- **Framework Preset**: Next.js (auto-detected).
- **Build Command**: default (`next build`) — leave as-is.
- **Node.js version**: 20.x (already pinned via `engines` in `package.json`).
- Routes that call the LLM or do synchronous ingestion already declare
  `export const maxDuration = 60` (chat, agent-config generation, knowledge
  upload) — this requires a Pro plan or higher for durations beyond the
  Hobby plan's 10s cap. On Hobby, those three routes will be capped at 10s
  by Vercel regardless of the export; a fast model like `gpt-4o-mini`
  normally finishes well within that, but a long tool-calling turn could
  time out. Upgrade to Pro if you hit that.

## 4. Environment variables to set in Vercel

| Variable | Value | Required |
|---|---|---|
| `DATABASE_URL` | Supabase pooled connection string, `?sslmode=require&pgbouncer=true` | Yes |
| `AUTH_SECRET` | `openssl rand -base64 32` | Yes |
| `AUTH_URL` | Your production URL (e.g. `https://your-app.vercel.app`) | Recommended (NextAuth also auto-trusts Vercel's own host) |
| `SECRETS_ENCRYPTION_KEY` | `openssl rand -base64 32` | Yes |
| `OPENAI_API_KEY` | Your OpenAI key | Yes — powers chat, agent generation, and embeddings |
| `REDIS_URL` | — | Do not set. Leaving it unset is what cleanly disables URL knowledge ingestion; everything else works without it. |
| `ANTHROPIC_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | — | Optional, only if you want to offer those providers |

## 5. What already works with just the above

- **Auth/sessions**: Credentials login, signup, logout, JWT sessions — no
  extra config; NextAuth v5 trusts Vercel's host automatically.
- **Agent generation**: onboarding's AI-assisted config generation
  (`/api/sales/agents/generate`) uses `resolveModel(..., { provider: "openai", model: "gpt-4o-mini" })`
  by default — works as soon as `OPENAI_API_KEY` is set.
- **Chat / tool calling / qualification / lead capture / meeting booking**:
  all synchronous, in the request/response cycle — no queue involved.
- **Knowledge (text paste + PDF upload)**: ingested synchronously inline
  (chunk -> embed via `text-embedding-3-small` -> store in pgvector) — zero
  Redis dependency, confirmed in `packages/sales-agent/src/knowledge.ts`.
- **Knowledge (Website URL)**: requires a background queue (BullMQ +
  Redis + a long-running worker), which doesn't fit Vercel's
  invoke-and-die serverless model. With `REDIS_URL` unset, the app now:
  - Rejects `POST /api/sales/agents/[id]/knowledge` with `type: "url"`
    with a clear `501` and message, rather than creating a source that
    silently never processes (`apps/web/app/api/sales/agents/[id]/knowledge/route.ts`).
  - Disables the "Website URL" button in the Knowledge tab's UI with a
    visible explanation, rather than letting you submit into a dead end
    (`apps/web/app/sales/agents/[id]/_components/knowledge-tab.tsx`).
  - Every other queue-backed code path in the repo (`getRedisConnection`,
    `getQueues`, `subscribeToRun`) now throws immediately and honestly if
    `REDIS_URL` is unset, instead of silently hanging while retrying a
    connection to `localhost` that will never exist in production.

## 6. Adding URL knowledge ingestion later

Not part of this deployment. When you want it: add a managed Redis (e.g.
Upstash, using its TCP endpoint — not REST mode, BullMQ needs real Redis
commands) and a small always-on worker process (`apps/worker`, e.g. on
Railway/Render/Fly — it cannot run on Vercel itself). Setting `REDIS_URL`
alone re-enables the UI and API path with no further code changes.
