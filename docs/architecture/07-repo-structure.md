# Repository / Folder Structure

pnpm workspaces + Turborepo, following Mastra's "thin core + adapter packages" shape (doc 01 §1) at a scale appropriate to our MVP — not 100 packages, but real boundaries between the modules named in the platform brief (Agent Runtime, Workflow Engine, Tools, Knowledge, Memory, Model Providers, Execution Engine, Task System, Observability, API, Dashboard).

```
ai-agent/
├── apps/
│   ├── web/                     # Next.js dashboard + API route handlers (BFF)
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── agents/           # list, [id] detail (overview/instructions/knowledge/tools/memory/workflows/connections/permissions/runs/analytics)
│   │   │   │   ├── workflows/        # list, [id] builder canvas
│   │   │   │   ├── knowledge/
│   │   │   │   ├── tools/
│   │   │   │   ├── models/
│   │   │   │   ├── tasks/
│   │   │   │   ├── runs/             # trace viewer
│   │   │   │   ├── analytics/
│   │   │   │   ├── integrations/
│   │   │   │   ├── settings/
│   │   │   │   └── playground/       # agent test console
│   │   │   └── api/
│   │   │       ├── agents/[id]/run/route.ts
│   │   │       ├── workflows/[id]/run/route.ts
│   │   │       ├── approvals/[id]/resolve/route.ts
│   │   │       ├── webhooks/[workflowId]/[secret]/route.ts
│   │   │       └── ...
│   │   └── ...
│   └── worker/                  # standalone Node service — BullMQ consumers
│       └── src/
│           ├── queues/               # queue + worker definitions per job type
│           ├── jobs/
│           │   ├── agent-run.ts
│           │   ├── workflow-step.ts
│           │   ├── workflow-resume.ts
│           │   ├── deliver-agent-message.ts
│           │   ├── scheduled-trigger.ts
│           │   └── embed-memory.ts
│           └── index.ts
│
├── packages/
│   ├── core/                    # shared kernel types/interfaces only (Agent, Tool, Model, Memory contracts) — no implementations
│   ├── shared-types/            # Zod schemas shared FE/BE (agent config, message envelopes, workflow defs)
│   ├── model-providers/         # provider router: OpenAI/Anthropic/Gemini adapters
│   ├── agent-runtime/           # compiles an agent invocation into a workflow run
│   ├── workflow-engine/         # step graph, execution engine, suspend/resume
│   ├── tools/                   # tool registry, executor, approval gate, built-in tools (http, web-search, file-reader, db-query...)
│   ├── memory/                  # 3-tier memory (history/working/semantic)
│   ├── rag/                     # chunking, embedding, vector-query tool, ingestion pipeline
│   ├── message-bus/             # agent↔agent / human↔agent messaging, event bus
│   ├── tasks/                   # task system service functions
│   ├── scheduler/                # cron/delayed/event trigger registration on BullMQ
│   ├── observability/           # span writer, trace query helpers, OTel exporter (later)
│   ├── auth/                    # RBAC + policy/approval engine
│   ├── storage/                 # Drizzle schema + one repository module per domain
│   ├── queue/                   # BullMQ queue definitions shared by web (enqueue) and worker (consume)
│   └── ui/                      # design system component library (own, not Mastra's)
│
├── drizzle/                     # generated SQL migrations
├── docs/
│   └── architecture/            # this document set
├── docker-compose.yml           # local Postgres (pgvector) + Redis
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

## Boundary rule

`apps/web` and `apps/worker` are the only things allowed to depend on *everything*; packages depend only downward (e.g. `agent-runtime` depends on `model-providers`, `tools`, `memory`, `workflow-engine`, `storage`, `observability` — but nothing depends back on `agent-runtime`). `storage` is the only package that imports Drizzle/talks to Postgres directly; every other package calls storage's repository functions. This mirrors the domain-split discipline noted in doc 01 §11.
