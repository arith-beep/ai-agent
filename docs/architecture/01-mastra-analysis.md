# Mastra Architecture Analysis

Research performed against a live clone of `github.com/mastra-ai/mastra` (source code, not just docs). This document covers the 18 requested areas, what's genuinely reusable, and what we build ourselves.

## Licensing (read this first — it shapes everything else)

Mastra's repo carries **three license regimes**, not one:

| License | Scope |
|---|---|
| **Apache 2.0** (default, per root `LICENSE.md`) | Everything *not* explicitly carved out below. This covers the actual architecture we care about: `packages/core` (Agent/Workflow/Tool/Memory/Storage/Vector/MCP/Observability/Evals kernel), `packages/memory`, `packages/rag`, `packages/mcp`, `packages/server`, `packages/deployer`, all `stores/*` adapters, `packages/playground-ui` (explicit), `packages/editor` (minus its `ee/` folder). |
| **Mastra Enterprise Edition License v1.0** (`ee/LICENSE`) | Any directory literally named `ee/`, anywhere in the tree — e.g. `packages/core/src/auth/ee` (fine-grained authorization / license-key gating), `packages/core/src/agent-builder/ee`, `packages/editor/src/ee` (AI-assisted agent/workflow generation), `packages/playground/src/ee` and `packages/playground-ui/src/ee` (the "Signals" trace-analytics UI: sankey diagrams, anomaly detection, theme drilldowns). This is **source-available, not open source** — production use requires a paid written agreement with Kepler Software, Inc. (Mastra's corp entity). We treat `ee/` code the same as a competitor's private source: architecturally off-limits, not just "don't copy the code." |
| **Elastic License 2.0** | Narrowly `packages/connect/src/providers/*` (third-party API action templates adapted from NangoHQ). Not relevant to our build. |

**Decision: we do not copy any Mastra code.** We build 100% original code, using the Apache-2.0 portions purely as architectural reference (which is unrestricted — you can't copyright an architecture), and we explicitly avoid even reading `ee/` directories for "inspiration" on FGA/permissions or AI-assisted builder/trace-analytics features, since those are the two areas Mastra deliberately keeps proprietary. Our own permissions/policy engine and observability UI are designed independently (see docs 04–06).

## Findings by area

**1. Monorepo structure** — pnpm workspaces + Turborepo. One large `packages/core` kernel (Agent alone is ~10k lines) plus ~100 thin adapter packages (`stores/`, `deployers/`, `server-adapters/`, `observability/*`) implementing core's interfaces — a hexagonal/ports-and-adapters layout at monorepo scale. **We reuse the shape** (thin core + adapter packages, pnpm+Turborepo) but keep core an order of magnitude smaller — no Skills/Channels/Signals/Notifications/Goals/Workspace product-layer features bolted onto the kernel.

**2. Agent architecture** — `Agent` class holds instructions, model(s), tools, memory, sub-agents, processors, scorers. The single most important idea: **the tool-calling agent loop is itself implemented as a workflow run** (`createAgenticLoopWorkflow`), so it gets suspend/resume, durability and step-level tracing for free instead of a bespoke loop mechanism. **We reuse this idea directly** — our Agent Runtime compiles every agent invocation into a Workflow Engine run (see doc 04). We do not carry over Mastra's legacy/vNext dual code paths.

**3. Workflow engine** — a fluent builder (`.then/.branch/.parallel/.dowhile/.dountil/.foreach/.sleep/.waitForEvent`) that compiles to a frozen `ExecutionGraph`, executed by a pluggable `ExecutionEngine`. Suspend/resume persists a serializable snapshot so long-running/human-in-the-loop workflows survive process restarts. **We reuse the primitive set and the snapshot-based suspend/resume mechanism** — it's the single highest-leverage piece since tool approval, human-in-the-loop, and durable agent loops all depend on it (see doc 06). We drop Mastra's 7-type-parameter generics; TypeScript ergonomics can be simpler.

**4. Tool execution** — tools carry `inputSchema`/`outputSchema` (schema-format agnostic: Zod, JSON Schema, Standard Schema), an `execute()` function, and a `requireApproval` flag/predicate that reuses the *workflow* suspend/resume mechanism for human approval — not a separate state machine. **We reuse this pattern** (Zod-first, one schema format, not four) and the "approval = suspend" trick.

**5. Memory** — three-tier model: raw conversation history (windowed), working memory (a structured/templated record the agent maintains about the user, injected into the system prompt), and semantic recall (vector search over past messages). A more advanced "observational/reflection memory" layer exists but is v2-grade complexity. **We reuse the three-tier split as our baseline**; reflection memory is a later phase, not MVP.

**6. RAG/Knowledge** — deliberately thin: a document chunker, a `createVectorQueryTool` that wraps a vector-store query as an ordinary agent tool, optional reranking/GraphRAG. Vector store abstraction (`MastraVector`) is a small, clean interface (`query/upsert/createIndex/deleteVector...`) implemented by ~23 adapters. **We reuse the small interface and the "RAG is just tools" pattern**; we ship one backend (pgvector) instead of 23.

**7. Model providers** — wraps the Vercel AI SDK (does not reimplement LLM calling), but vendors *three parallel major versions* of the AI SDK simultaneously for back-compat, plus a custom `ModelRouterLanguageModel` that resolves `"provider/model"` strings against a generated provider registry. **We reuse the provider-string router ergonomic** (`"openai/gpt-4o"`) but pin a single AI SDK version — no multi-version vendoring.

**8. MCP** — both directions: an `MCPClient` (consumes external MCP servers, full OAuth) and an `MCPServer` (exposes an app's own tools/resources as MCP, Hono-based transport). Discovered MCP tools are normalized into the same `ToolAction` type as native tools. **We reuse the client+server duality**, built directly against the official MCP SDK.

**9. Observability** — an internal, typed span model (`SpanType`: AGENT_RUN, MODEL_STEP, MODEL_INFERENCE, tool-call, workflow-step spans) propagated via async context, decoupled from OpenTelemetry (OTel is one exporter among several vendor exporters). **We reuse "internal span model first, OTel as an exporter"** but implement only agent-run/model-call/tool-call/workflow-step span types — not the vendor-exporter breadth.

**10. Evals** — a 4-stage scorer pipeline (`preprocess → analyze → generateScore → generateReason`), LLM-as-judge pattern, with a Vitest-matcher integration that turns evals into ordinary CI-gateable tests, plus a retroactive trace-scoring workflow. **We reuse the 4-stage shape and the "evals are just tests" integration**, built from scratch — evals is a small enough surface not to depend on anyone else's package for.

**11. Storage** — not one fat interface: storage is split into ~28 "domains" (threads, workflow-snapshots, scores, observability, schedules, etc.), each independently implementable per backend. **We reuse the domain-split idea** (agents/threads/messages, workflow-snapshots, traces, scores, tasks, messages-bus as our domains) but implement one backend — Postgres — not 29.

**12. Deployment** — clean split between a framework-agnostic route/handler layer (Hono-based `server` package) and thin per-platform deploy adapters (`deployers/*`) and per-framework mount adapters (`server-adapters/*`). **We reuse the split** (handler layer decoupled from deploy target) but ship one deploy target (our own infra) and one server integration (Next.js) rather than a matrix.

**13. Studio/dashboard** — the actual Studio app (`packages/playground`) is a large, product-specific React app tightly coupled to Mastra's own type surface; its advanced analytics ("Signals") are EE-licensed regardless. We do **not** reuse Studio code (not even the Apache-2.0 shell) — we design our own dashboard from scratch (see UI section, doc 02), reusing only the *concept* of a reusable component library separated from the app shell.

**14. MCP support** — covered in #8.

**15. Auth** — Mastra's own fine-grained authorization (FGA) is EE-licensed and off-limits. We design our own RBAC/policy engine from scratch (doc 02/03) — it's a small, well-understood problem (org → roles → permissions, plus an approval-policy table for agent actions) that doesn't need Mastra's proprietary implementation as a reference.

**16. Deployment model** — covered in #12.

**17. Multi-agent** — Mastra has "agent networks" (a routing loop between sub-agents) but no first-class message-bus/task/event system resembling what we need (human↔agent, agent↔agent, with priorities/retries/audit). This is a genuine gap in Mastra relative to our requirements — **we design this ourselves from scratch** (doc 05); it's the most original part of our platform.

**18. Human-in-the-loop** — handled via the suspend/resume primitive shared by workflows and tool-approval (#3/#4). We reuse that mechanism and build our own approval/policy UI and data model on top (doc 03).

## Summary: reuse vs. build

| | Reuse the *idea* | Build entirely ourselves |
|---|---|---|
| Agent loop = workflow run | ✅ | |
| Workflow step primitives + suspend/resume snapshot | ✅ | |
| Tool approval via suspend | ✅ | |
| Memory 3-tier split | ✅ | |
| RAG-as-tools + small vector interface | ✅ | |
| Provider-string model router | ✅ | |
| MCP client+server duality | ✅ | |
| Internal span model, OTel as exporter | ✅ | |
| Evals 4-stage pipeline | ✅ | |
| Storage domain-split | ✅ | |
| Handler-layer/deploy-adapter split | ✅ | |
| Multi-agent message bus / task system / event bus | | ✅ (no Mastra equivalent) |
| RBAC + approval policy engine | | ✅ (Mastra's is EE-licensed) |
| Dashboard/Studio UI | | ✅ (own design system) |
| AI-assisted agent/workflow builder | | ✅ or skip (Mastra's is EE-licensed) |
| Advanced trace analytics ("Signals") | | later phase, own design (Mastra's is EE-licensed) |
