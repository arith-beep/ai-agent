# Multi-Agent Communication Design

This has no equivalent in Mastra's OSS code (doc 01 §17) — it's the most original module in the platform and the one that turns a collection of chatbots into an actual multi-agent operations system.

## Requirements recap

Human → Agent, Agent → Human, Agent → Agent, with: agent IDs, conversations, tasks, events, message history, structured payloads, priorities, retries, failure handling, permissions, audit logs.

## `packages/message-bus`

### Data model (see doc 03 for full DDL)

`conversations` (a thread between participants) → `conversation_participants` (human or agent) → `agent_messages` (the actual envelopes). A separate append-only `agent_events` table is a lighter-weight pub/sub log for things that aren't addressed to a specific recipient (e.g. "low call volume detected" that any subscribed agent can react to).

### Message envelope

```ts
interface AgentMessage {
  id: string;
  conversationId: string;
  from: { type: 'human' | 'agent'; id: string };
  to: { type: 'human' | 'agent'; id: string };
  kind: 'task' | 'query' | 'notification' | 'event' | 'response';
  payload: Record<string, unknown>;   // Zod-validated per `kind` (TaskPayload, QueryPayload, ...)
  priority: 'low' | 'normal' | 'high' | 'urgent';
  correlationId?: string;             // links a response back to the query/task that triggered it
  createdAt: string;
}
```

`kind` determines the Zod schema the `payload` is validated against and what happens on delivery (below). This mirrors how Mastra tools are schema-typed per action, applied to inter-agent envelopes instead.

### Send path

1. Sender (an agent's tool-call step, or a human via the dashboard) calls `messageBus.send(message)`.
2. `send()` validates the payload against the `kind`'s schema, checks **authorization**: is `from` allowed to message `to`? — looked up via `agent_connections` (peer/reports_to/manages/delegates_to) plus `agent_permissions`/org `policies`. Unauthorized sends are rejected and audit-logged, not silently dropped.
3. Writes the `agent_messages` row (`status=pending`), enqueues a `deliver-agent-message` BullMQ job with the message id. Returns immediately — sending is async even between two agents.
4. Writes an `audit_logs` entry (`action=message.sent`).

### Delivery path (worker)

1. Job handler loads the message, sets `status=delivered`.
2. If `to.type === 'human'`: creates a dashboard notification (and, depending on org settings, an email/Slack tool call) — no agent run involved.
3. If `to.type === 'agent'`:
   - `kind='task'` → also creates a `tasks` row (`created_by=from`, `owner=to`) so it shows up in the Tasks module, *and* triggers a new `agent_runs` for the recipient agent with the message as structured input (tagged `sourceKind: 'agent_message'`) so the agent actually acts on it rather than the task silently sitting unopened.
   - `kind='query'`/`'event'`/`'notification'` → triggers a new `agent_runs` for the recipient with the message as input; no task is auto-created.
   - `kind='response'` → delivered as input to the run identified by `correlationId` if that run is `waiting_for_response` (a workflow suspend state — an agent can `waitForEvent` on a specific `correlationId`, letting A block on B's answer without polling), otherwise just recorded in the conversation.
4. On successful hand-off, `status=processed`.

### Retries & failure handling

- BullMQ job retry with exponential backoff (`attempts: 5`, backoff `type: exponential, delay: 2000`) covers transient failures (recipient's model provider down, DB hiccup).
- After max attempts, `status=failed`, `error_message` set, and — this is the "notify a human" escalation the spec calls for — the platform sends a `notification`-kind message to the sending agent's `human_manager_id` (or, if the recipient is the one that failed to process, to the recipient agent's manager) so a failure never disappears silently.
- Every status transition (`pending→delivered→processing→processed|failed`) writes an `audit_logs` row.

### Priorities

BullMQ job priority is set from `agent_messages.priority` (`urgent` jobs jump the queue). This is intentionally simple for MVP — no separate priority queues per org, just BullMQ's built-in numeric priority.

## Worked example: the spec's Sales scenario

1. **Sales Manager Agent** (on its scheduled run, doc "Scheduler") detects low call volume via a CRM tool call → sends `kind: 'query'` to **Sales Analytics Agent**: `{ payload: { question: 'why is call volume down this week', context: {...} } }`.
2. Delivery triggers a new `agent_runs` for Sales Analytics Agent with that query as input. It runs its own tool calls (CRM/DB query tools), produces findings, and sends `kind: 'response'` back with `correlationId` = the original message's id.
3. Sales Manager Agent's run had suspended on `waitForEvent(correlationId)` (a workflow primitive, doc 06) — the response delivery resumes that suspended workflow run with the findings as the resume payload.
4. Sales Manager Agent creates `tasks` rows for follow-up actions (via the Task System, doc 03 `tasks` table — `created_by_type=agent`).
5. Sales Manager Agent sends `kind: 'notification'` to the **human** Sales Manager (`to.type='human', to.id=user_id`) summarizing what happened — this becomes an in-app notification (and optionally an email via the email tool).

Every step above is a row in `agent_messages`/`agent_events`/`tasks`/`spans`/`audit_logs` — the Runs and Analytics dashboards are just queries over this data, nothing is synthesized for display.

## What this deliberately does not do (MVP scope)

- No custom pub/sub broker (Kafka/NATS) — Postgres + BullMQ/Redis is enough at this scale and keeps ops simple; revisit only if message volume demands it.
- No cross-org agent messaging — `conversations`/`agent_messages` are always scoped to one `org_id`; inter-org agent collaboration is out of scope until asked for.
