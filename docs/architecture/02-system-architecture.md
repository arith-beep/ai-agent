# System Architecture

## Design goals

- Multi-tenant (organizations → departments → users/agents) from day one.
- Agent execution is durable and asynchronous — a request to "run an agent" or "run a workflow" is never held open in an HTTP request; it's a background job whose progress streams to the UI.
- Every action an agent takes produces a trace. Every cross-boundary write (task, message, approval) produces an audit log entry.
- Clear module boundaries: Agent Runtime, Workflow Engine, Tools, Knowledge, Memory, Model Providers, Execution Engine, Task System, Message Bus, Observability, API, Dashboard. No module reaches into another's tables directly — only through its package's repository/service functions.

## Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, own component library | Server components for dashboard pages, streaming UI for the Playground, one deploy artifact. |
| Backend (API) | Next.js Route Handlers, acting as a thin BFF | CRUD, auth-gated reads/writes. Never runs long agent/workflow executions in-process. |
| Execution backend | Standalone Node worker service (`apps/worker`) | Runs the Agent Runtime, Workflow Engine, Scheduler, and Message Bus consumers. Decoupled from the web app's request lifecycle so a 10-minute workflow doesn't touch an HTTP timeout. |
| Database | PostgreSQL (Supabase-hosted or self-hosted) | Single source of truth for everything: relational data, JSONB for flexible payloads/definitions, and vectors via pgvector — one database to operate instead of three. |
| ORM | Drizzle | Typed schema-as-code, first-class migrations, works identically against Supabase or plain Postgres. |
| Vector store | pgvector extension on the same Postgres | No separate vector infra for MVP. The `MastraVector`-style interface (see doc 04) means we can add Pinecone/Qdrant adapters later without touching callers. |
| Job queue | BullMQ + Redis | Agent runs, workflow steps, tool executions, scheduled jobs, message-bus delivery all flow through durable, retryable queues with backoff, delay, and repeatable (cron) jobs built in. |
| Realtime | Supabase Realtime (Postgres logical replication) if on Supabase; otherwise a small WebSocket gateway in `apps/worker` publishing to Redis pub/sub | The Playground and dashboard subscribe to `spans`/`agent_runs`/`workflow_step_runs` row changes for a given `run_id` — UI never polls. |
| Auth | Supabase Auth (or NextAuth against Postgres if not using Supabase) | Org/team membership + roles stored in our own `org_members` table; Supabase Auth only handles identity (session, password/OAuth). |
| AI SDK | Vercel AI SDK, single pinned major version, wrapped by our own `model-providers` package | Battle-tested provider clients (OpenAI/Anthropic/Google) without hand-rolling streaming/tool-call parsing; our router sits on top so callers never import AI SDK directly. |
| Secrets | AES-256-GCM envelope encryption, app-level KMS key from env/secret manager | API keys for model providers and tool integrations are encrypted at rest; decrypted only inside the worker process at call time, never sent to the browser. |

## Module boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│ apps/web  (Next.js — dashboard + API route handlers)             │
│  reads/writes via packages/storage repositories only             │
│  enqueues jobs via packages/queue, never executes agents inline  │
└─────────────────────────────────────────────────────────────────┘
                              │ BullMQ (Redis)         ▲ Realtime (Postgres)
                              ▼                         │
┌─────────────────────────────────────────────────────────────────┐
│ apps/worker (Node service — long-running, horizontally scalable) │
│                                                                   │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────┐ │
│  │ Agent Runtime  │→│ Workflow Engine │→│ Execution Engine     │ │
│  │ (compiles a    │  │ (step graph,    │  │ (interprets one     │ │
│  │  run into a    │  │  suspend/resume)│  │  step: agent/tool/  │ │
│  │  workflow)     │  │                 │  │  http/db/condition) │ │
│  └───────┬───────┘  └────────┬───────┘  └──────────┬──────────┘ │
│          │                    │                      │           │
│  ┌───────▼───────┐  ┌────────▼───────┐  ┌───────────▼─────────┐ │
│  │ Model Providers│  │ Tool Registry  │  │ Knowledge / RAG      │ │
│  │ (router: OpenAI│  │ (execution +   │  │ (chunk/embed/query,  │ │
│  │  Anthropic,    │  │  approval gate)│  │  pgvector)            │ │
│  │  Gemini)       │  │                 │  │                      │ │
│  └───────────────┘  └────────────────┘  └──────────────────────┘ │
│                                                                   │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────┐ │
│  │ Memory         │  │ Message Bus     │  │ Scheduler            │ │
│  │ (history,      │  │ (agent↔agent,   │  │ (cron/delayed/event  │ │
│  │  working, sem.)│  │  human↔agent)   │  │  triggers)            │ │
│  └───────────────┘  └────────────────┘  └──────────────────────┘ │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Observability (span writer)   │   Task System                │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PostgreSQL (+ pgvector)                                          │
│ packages/storage — one repository module per domain, no module   │
│ reads another domain's tables directly                           │
└─────────────────────────────────────────────────────────────────┘
```

## Request flow: "run an agent" (Playground)

1. Browser calls `POST /api/agents/:id/run` (Next.js route handler) with the user message.
2. Handler validates input (Zod), writes an `agent_runs` row (`status=queued`), enqueues an `agent-run` BullMQ job with `{runId, agentId, input}`, returns `{runId}` immediately.
3. Browser subscribes to realtime changes on `spans` and `agent_runs` filtered by `runId`.
4. Worker picks up the job → Agent Runtime resolves the agent's config (model, tools, memory, KBs, permissions) → compiles a workflow run (retrieve-memory → model-call [→ tool-call]* → persist-memory) → Workflow Engine executes it, writing a `spans` row per step as it happens and updating `agent_runs.status`.
5. If a tool requires approval, the Execution Engine writes an `approvals` row and suspends the workflow (persists snapshot to `workflow_runs.snapshot`), sets `agent_runs.status=waiting_approval`. A human resolves it in the dashboard → `POST /api/approvals/:id/resolve` → enqueues a `workflow-resume` job → execution continues from the snapshot.
6. On completion, `agent_runs.status=completed`, final output + token usage + cost persisted. UI already has the full trace because it streamed span-by-span.

## Multi-tenancy & RBAC

- `organizations` is the tenant boundary; every domain table carries `org_id` and every query is scoped by it (enforced at the repository layer, plus Postgres RLS as defense-in-depth when on Supabase).
- `org_members` maps `user_id → org_id → role` (owner/admin/manager/member/viewer). Roles map to a fixed permission set for dashboard actions (create agent, approve action, edit workflow, etc.).
- Agent-level and tool-level permissions are separate from human RBAC: see doc 03 `agent_permissions` / `policies` — these govern what an *agent* may do autonomously vs. what requires human approval, independent of which human role can configure it.

See `03-database-schema.md`, `04-agent-runtime.md`, `05-multi-agent-communication.md`, `06-workflow-engine.md` for the detailed designs referenced above, `07-repo-structure.md` for the concrete package layout, and `08-mvp-roadmap.md` for build sequencing.
