# Workflow Engine Design

Reuses the primitive set and the snapshot-based suspend/resume mechanism from Mastra's workflow engine (doc 01 §3), reimplemented independently and simplified (no 7-type-parameter generics, one execution engine implementation for MVP instead of a pluggable interface — we keep the seam so a second engine is possible later, we just don't build it yet).

## `packages/workflow-engine`

### Definition model

A workflow is a **serializable graph**, stored as JSON in `workflows.definition`, not code:

```ts
interface WorkflowDefinition {
  id: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];    // { from: nodeId, to: nodeId, condition?: string }
  entryNodeId: string;
  state?: JSONSchema;        // shape of the workflow-scoped mutable state
}

type WorkflowNode =
  | { id: string; type: 'trigger'; config: TriggerConfig }
  | { id: string; type: 'agent'; agentId: string; inputMapping: JSONPathMap }
  | { id: string; type: 'llm'; model: ModelRef; prompt: string }
  | { id: string; type: 'tool'; toolId: string; inputMapping: JSONPathMap }
  | { id: string; type: 'http_request'; config: HttpRequestConfig }
  | { id: string; type: 'db_query'; config: DbQueryConfig }
  | { id: string; type: 'condition'; expression: string }        // branch
  | { id: string; type: 'loop'; mode: 'for_each' | 'while'; over?: string; condition?: string; body: WorkflowNode[] }
  | { id: string; type: 'delay'; durationMs?: number; until?: string }
  | { id: string; type: 'approval'; approverRole?: string; payloadMapping: JSONPathMap }
  | { id: string; type: 'send_email'; config: EmailConfig }
  | { id: string; type: 'send_message'; config: AgentMessageConfig }   // → packages/message-bus
  | { id: string; type: 'create_task'; config: TaskConfig }
  | { id: string; type: 'webhook'; config: WebhookConfig }
  | { id: string; type: 'transform'; expression: string };            // JSONata/jq-style mapping
```

The **Workflow Builder UI** (dashboard module) edits this JSON via a node canvas; the engine never depends on the UI.

### Execution

`Run` = one execution of a `WorkflowDefinition` against an input, tracked in `workflow_runs` (+ `workflow_step_runs` per node visited).

```ts
async function startRun(workflowId: string, input: unknown, triggeredBy: TriggerSource): Promise<{ runId: string }>
async function resumeRun(runId: string, resumePayload: unknown): Promise<void>
```

The **Execution Engine** (`packages/workflow-engine/src/execution-engine.ts`) walks the graph from `entryNodeId`, following edges (evaluating `condition` expressions for branches), executing each node type via a small dispatch table:

| Node type | Executor delegates to |
|---|---|
| `agent` | `packages/agent-runtime` (nested agent invocation — used when a workflow explicitly calls an agent as a step, distinct from an agent's own internal loop) |
| `llm` | `packages/model-providers` directly (no tool loop — a single completion step) |
| `tool` | `packages/tools` executor |
| `http_request` / `db_query` / `webhook` | built-in step handlers in `packages/workflow-engine/src/steps/` |
| `send_email` / `send_message` / `create_task` | thin adapters calling `packages/message-bus` / `packages/tasks` |
| `condition` / `transform` | pure in-process evaluation (sandboxed expression evaluator — no `eval`) |
| `loop` | re-invokes the engine over the body nodes per iteration, with a max-iteration guard |
| `delay` | schedules a BullMQ delayed job and suspends (see below) — does not block a worker thread |
| `approval` | writes an `approvals` row and suspends |

Each node execution writes a `workflow_step_runs` row and a child `spans` row (`type=workflow_step`), so workflow runs show up in the same trace viewer as agent runs.

### Suspend / resume

This is the mechanism the whole human-in-the-loop story depends on (doc 01 flagged it as the single highest-priority primitive to build early):

1. A node handler can return `{ status: 'suspended', reason, resumeKey }` instead of a normal output.
2. The engine persists a **snapshot** — `{ currentNodeId, state, pendingResumeKey }` — to `workflow_runs.snapshot`, sets `status=suspended`, and does **not** hold any in-memory job open (the BullMQ job completes normally; suspension is a terminal state for that job, not a blocked thread).
3. Something external resolves the suspension later: a human approving/rejecting (`approval` nodes and tool-approval both go through this), a `delay`'s timer firing (a BullMQ delayed job whose payload is `{runId, resumeKey}`), or a `waitForEvent`-style node matching an incoming `agent_events`/`agent_messages` row against `resumeKey`.
4. The resolver calls `resumeRun(runId, payload)`, which loads the snapshot, re-enters the engine at `currentNodeId` with the resume payload injected, and continues walking the graph.

This is exactly the same primitive used for agent tool-approval (doc 04) — one suspend/resume implementation serves both.

### Triggers

- **Manual**: dashboard "Run" button → `startRun` directly.
- **Scheduled**: `packages/scheduler` (BullMQ repeatable jobs, driven by `scheduled_jobs.cron_expression`) calls `startRun` on schedule.
- **Webhook**: a Next.js route (`/api/webhooks/:workflowId/:secret`) validates the secret and calls `startRun` with the request body as input.
- **Event-driven**: a workflow can declare a `trigger` node of `{source: 'agent_event', eventType}`; the Message Bus's event dispatcher matches new `agent_events` rows against registered triggers and calls `startRun`.

### Parallel & branch execution

- `condition` nodes with multiple outgoing edges = branches; the engine evaluates the expression once and follows exactly one matching edge (else the default edge).
- True parallel fan-out (multiple nodes runnable concurrently with no data dependency between them) is expressed as multiple edges from one node with no `condition` — the engine dispatches all of them and joins when all complete before proceeding past a designated join node, mirroring Mastra's `.parallel()`.

### What we simplify vs. Mastra

- One execution engine implementation (interface kept abstract for a future alternate engine, e.g. a Temporal-backed one, but not built now).
- Node definitions are the *only* way to author a workflow for MVP — no code-first workflow API. (Mastra supports both; we can add a code-first builder later without changing the engine, since it just needs to emit the same `WorkflowDefinition` JSON.)
- Expression evaluation for `condition`/`transform` uses a small sandboxed subset (JSONata) rather than arbitrary JS, to keep workflows safely editable by non-engineers in the builder UI.
