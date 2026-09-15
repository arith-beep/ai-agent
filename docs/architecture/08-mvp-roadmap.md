# MVP Roadmap

Built incrementally; each milestone is a real, working slice — no fake buttons, no hardcoded demo responses. Milestone 1 is the exact slice specified in the brief.

## Milestone 0 — Foundation
- Monorepo scaffold (pnpm + Turborepo), `docker-compose.yml` (Postgres+pgvector, Redis).
- Drizzle schema for the full doc 03 model + migrations.
- Auth (Supabase Auth or NextAuth) + `organizations`/`org_members` + minimal RBAC middleware.
- Base dashboard shell: nav (Dashboard, Agents, Workflows, Knowledge, Tools, Models, Tasks, Runs, Analytics, Integrations, Settings), own design system (`packages/ui`) — premium developer-tool aesthetic, not a generic AI template.
- `packages/queue` BullMQ setup, `apps/worker` skeleton that can pick up a no-op job end-to-end (proves the pipeline before real logic lands).

## Milestone 1 — Core agent loop (the brief's named first milestone)
Create Agent → configure model → add system prompt → attach tools → attach knowledge → run agent → see execution trace → agent can create a task → agent can message another agent.

- `packages/model-providers`: OpenAI + Anthropic adapters (Gemini can trail slightly), provider-string router, encrypted `model_credentials` CRUD.
- Agents module: create/edit/delete/enable-disable/clone, full config form (name, role, department, description, objective, system prompt, model+temperature+tokens+fallback, status).
- `packages/tools`: tool registry + 2–3 real built-in tools (HTTP request tool, file reader, web search) with schema+execution logging; Agents page "Tools" tab to attach them.
- `packages/rag` + `knowledge_bases`/`knowledge_documents`/`knowledge_chunks`: URL and file upload ingestion → chunk → embed → pgvector store; Agents page "Knowledge" tab to attach a KB; a `vector_query` tool auto-attached when a KB is present.
- `packages/agent-runtime` + `packages/workflow-engine` (minimum viable: `then`/`branch` + suspend/resume for tool approval; full node type catalog lands in Milestone 3): agent run compiles to a workflow run per doc 04.
- `packages/observability`: span writer; Runs page shows a real trace tree (agent run → model calls → tool calls → knowledge retrieval) with token usage/cost/duration, structured execution events only (no chain-of-thought).
- Playground page: pick an agent, chat with it, watch the trace stream live via realtime subscription.
- `packages/tasks` minimal: an agent tool (`create_task`) that writes a real `tasks` row; Tasks page lists them.
- `packages/message-bus` minimal: two seeded demo agents that can message each other (`send_message` tool → `agent_messages` row → recipient agent run triggered); Runs page shows both runs correlated.

**Exit criterion**: a user creates an agent from the UI, gives it a system prompt + an HTTP tool + a small knowledge base, runs it in the Playground, watches a real trace with real tool calls and real retrieval, and the agent autonomously creates a task and sends a message to a second agent — all backed by real DB rows, no mocked responses.

## Milestone 2 — Workflow builder
- Node canvas UI for `WorkflowDefinition` (doc 06's node catalog: trigger, agent, llm, tool, http_request, db_query, condition, loop, delay, approval, send_email, send_message, create_task, webhook, transform).
- Full suspend/resume UX: Approvals inbox in the dashboard, workflow run detail shows suspended state and resolution.
- Sequential, branch, and parallel execution: exercised via at least one real multi-branch workflow (not just unit tests).

## Milestone 3 — Scheduler & full task system
- `packages/scheduler`: cron/delayed/event-triggered workflows and agent runs, `scheduled_jobs` CRUD UI.
- Task dependencies, stages, agent-autonomous stage transitions where policy allows.
- Policy/approval engine completeness: org-wide `policies`, per-agent `agent_permissions`, configurable approval routing.

## Milestone 4 — Observability, analytics, tool registry expansion
- Analytics dashboard: costs, agent activity, failures, approvals pending, running workflows — all real aggregate queries over `spans`/`agent_runs`/`tasks`.
- Tool registry expansion: CRM, Slack/internal chat, Supabase/Postgres, Google Calendar, GitHub, call-transcription, analytics connectors — each with real auth + schema + execution logs (doc 06's `send_email`/`send_message`/`http_request` land here as fully productized, not just the MVP stub versions).
- OTel exporter (optional, only if an external observability backend is actually requested).

## Milestone 5 — The three business agents
- **Sales Manager AI**: CRM tool integration, leads/dials/conversions/CPL/CPA monitoring workflow, scheduled hourly/nightly analysis (per the brief's examples).
- **Retention Manager AI**: payment/cancellation/retention KPI monitoring, call-center activity tool integration.
- **Licensed Agent Manager AI**: call transcript analysis, objection-handling and conversion-rate analytics.
- Wire all three together via `packages/message-bus` exactly per the brief's worked example (doc 05), plus scheduled morning-summary workflows to the human managers.

## Sequencing principle

Nothing in Milestone 2+ is a redesign of Milestone 1 — the workflow engine, message bus, and observability primitives built in Milestone 1 are the *same* ones used at full scale later; later milestones add node types, UI surface, and integrations, not new core abstractions. This is deliberate: it's the same reason Mastra's "agent loop = workflow run" decision pays off — build the primitive once, reuse it everywhere.
