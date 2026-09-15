# Agent Runtime Design

Core idea borrowed from Mastra (doc 01 §2): **an agent invocation is not a bespoke loop — it is compiled into a Workflow Engine run.** That single decision gives us, for free: suspend/resume for tool approval, durability across worker restarts, and uniform per-step tracing (a "model call" and a "tool call" are just workflow step types, so the same span-writing code covers both).

## `packages/agent-runtime`

```ts
interface AgentConfig {
  id: string;
  orgId: string;
  name: string;
  instructions: string | ((ctx: RequestContext) => string | Promise<string>);
  model: ModelRef;                // { provider, model, temperature, maxTokens }
  fallbackModel?: ModelRef;
  tools: ToolRef[];                // resolved from agent_tools
  knowledgeBases: KnowledgeBaseRef[];
  memory?: MemoryConfig;           // thread scope, working-memory schema, semantic recall on/off
  permissions: AgentPermission[];  // from agent_permissions + org policies
}

async function runAgent(input: {
  agentId: string;
  message: AgentMessageInput;      // user text, or a structured incoming agent_message
  threadId?: string;
  requestContext?: Record<string, unknown>;
}): Promise<{ runId: string }>
```

`runAgent` is called from the BullMQ `agent-run` job handler (never from the Next.js request path). It:

1. Loads `AgentConfig` via `packages/storage` (agents + agent_tools + agent_knowledge_bases + agent_permissions joined).
2. Creates the `agent_runs` row and root `traces`/`spans` row (`type=agent_run`).
3. Builds a **workflow definition in memory** (not persisted to `workflows` — these are ephemeral, generated per run) with this shape:

```
retrieve-memory  →  model-call  →  [has tool calls?] → branch:
                                         yes → tool-call(s) [parallel where independent] → model-call (loop)
                                         no  → persist-memory → done
```

4. Hands that definition to the Workflow Engine (doc 06) to execute. Every step the engine runs writes a `spans` row (parented to the agent-run root span) — this is what the Playground/trace viewer reads.
5. Each `model-call` step invokes `packages/model-providers` (the router — see below), streaming partial tokens back through the run's realtime channel as *structured* deltas (`{type:'text-delta', text}` / `{type:'tool-call-start', tool}` / `{type:'tool-call-result', ...}`), never raw provider "thinking"/reasoning fields — we explicitly strip/ignore any provider reasoning/thinking content before it reaches storage or the client, per the "no hidden chain-of-thought" requirement.
6. Each `tool-call` step invokes `packages/tools`' executor. If the resolved tool (via `agent_tools.config` merged with the tool's own `requireApproval`) requires approval, the executor writes an `approvals` row and returns a `SUSPEND` signal to the Workflow Engine, which persists the snapshot and parks the run at `waiting_approval` — exactly the same suspend path a workflow-authored approval node uses (see doc 06). Resuming an approval resumes the underlying workflow run with `{approved: boolean, note?}` as the resume payload.
7. On tool results, the loop model-call step is re-invoked with the tool result appended to the message list — this repeats until the model returns a final answer or a configured max-turns is hit.
8. `persist-memory` step writes new `memory_messages`, updates `memory_working` if the agent's system prompt/tools indicate a working-memory update, and (if semantic recall is enabled) enqueues an embedding job for the new messages — embedding is async/best-effort, never blocks the response.
9. Completion updates `agent_runs.status=completed`, aggregates `token_usage`/`estimated_cost` from all child spans, writes the root span's `output`.

## Model provider router (`packages/model-providers`)

- Thin wrapper over the Vercel AI SDK (single pinned version — see doc 01 §7 on why we don't vendor multiple AI SDK majors like Mastra does).
- `resolveModel("openai/gpt-4o")` / `resolveModel({provider:'anthropic', model:'claude-sonnet-5'})` → returns an AI-SDK `LanguageModel` plus our metadata (context window, cost-per-token table for cost estimation).
- Reads the org's `model_credentials` (decrypted server-side only, inside the worker process) — never passes a raw API key through any code path that could reach the browser.
- Fallback: if the primary model call throws (rate limit, outage), and `fallbackModel` is configured, the router retries once against the fallback and tags the span with `usedFallback: true`.
- Supported at launch: OpenAI, Anthropic, Google Gemini — adding a provider is implementing one adapter module against the shared `ProviderAdapter` interface, no changes to the Agent Runtime.

## What we deliberately do not carry over from Mastra

- No legacy/vNext dual execution path — one implementation.
- No "Skills"/"Channels"/"Signals"/"Goals"/"Notifications" subsystems baked into the Agent class — those are product-layer concerns; our equivalents (tasks, messages, approvals) are separate packages the runtime calls into, not fields on the agent.
- No exposure of provider "reasoning"/"thinking" tokens anywhere in storage or transport — the Playground shows structured execution events (tool calls, retrieval, agent messages) per the platform's own requirement, not a chain-of-thought transcript.

## Multi-agent invocation

When agent A's tool-call step is actually "send a message to agent B" (see doc 05), the Execution Engine does **not** synchronously nest a second `runAgent` call inside A's workflow run — it publishes to the Message Bus, which independently triggers a new `agent_runs` row for B. This keeps runs, traces and cost accounting per-agent and avoids unbounded call-stack depth when agents chain to each other; correlation is done via `agent_messages.correlation_id` linking A's outbound message span to B's inbound run.
