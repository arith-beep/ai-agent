# Database Schema (PostgreSQL + pgvector)

Domain-split, following the storage-domain lesson from Mastra (doc 01 §11): each concern below becomes its own Drizzle schema file under `packages/storage/src/schema/`, with a repository module that's the *only* code allowed to query those tables. Types are illustrative (Drizzle pgTable syntax), not final DDL.

## Tenancy & identity

- **organizations**: `id, name, slug, created_at`
- **users**: `id, email, name, avatar_url, created_at` (identity only; auth handled by Supabase Auth / NextAuth, this table mirrors the minimum we need to join against)
- **org_members**: `id, org_id, user_id, role[owner|admin|manager|member|viewer], created_at`
- **departments**: `id, org_id, name, description, parent_department_id?`

## Agents

- **agents**: `id, org_id, name, role, department_id, description, objective, system_prompt, model_provider, model_name, temperature, max_tokens, fallback_model_provider?, fallback_model_name?, status[draft|enabled|disabled], manager_agent_id? (FK agents.id), human_manager_id? (FK users.id), avatar_url?, created_by, created_at, updated_at`
- **agent_connections**: `id, agent_id, connected_agent_id, relationship_type[peer|reports_to|manages|delegates_to], created_at` — powers "assign other AI agents" and the manager→sub-agent graph used by the message bus for authorization.
- **agent_tools**: `id, agent_id, tool_id, config jsonb, enabled boolean`
- **agent_knowledge_bases**: `id, agent_id, knowledge_base_id`
- **agent_workflows**: `id, agent_id, workflow_id, trigger_mode[manual|autonomous]`
- **agent_permissions**: `id, agent_id, action_pattern (e.g. "crm.read", "email.send", "customer.delete"), requires_approval boolean, approver_role?, created_at` — the per-agent policy list; see `policies` below for org-wide defaults this can override.
- **agent_kpis**: `id, agent_id, name, target_value, current_value, unit, period[daily|weekly|monthly], updated_at`

## Tools

- **tools**: `id, org_id, name, description, category, input_schema jsonb, output_schema jsonb, auth_config_encrypted bytea?, created_by, created_at`
- **tool_executions**: `id, tool_id, agent_id, run_id, span_id, input jsonb, output jsonb, status[success|error], error_message?, started_at, completed_at`

## Knowledge / RAG

- **knowledge_bases**: `id, org_id, name, description, source_type[pdf|docx|txt|url|website|csv|database|api], config jsonb, created_by, created_at`
- **knowledge_documents**: `id, knowledge_base_id, source_uri, status[pending|parsing|chunking|embedding|ready|failed], metadata jsonb, error_message?, created_at`
- **knowledge_chunks**: `id, document_id, content text, embedding vector(1536), metadata jsonb, chunk_index int` — pgvector column, HNSW/IVFFlat index on `embedding`.

## Memory

- **memory_threads**: `id, agent_id, user_id?, resource_id?, title?, created_at`
- **memory_messages**: `id, thread_id, role[user|assistant|tool|system], content jsonb, tool_calls jsonb?, created_at` (windowed reads = raw history tier)
- **memory_working**: `id, thread_id, resource_id?, data jsonb, schema_version, updated_at` (working-memory tier — one row per thread or per resource depending on scope config)
- **memory_message_embeddings**: `id, message_id, embedding vector(1536)` (semantic recall tier — separate table so the hot path of writing a message never blocks on embedding)

## Workflows & execution

- **workflows**: `id, org_id, name, description, definition jsonb (node/edge graph), status[draft|published|archived], created_by, created_at, updated_at`
- **workflow_runs**: `id, workflow_id, status[queued|running|suspended|completed|failed|cancelled], triggered_by_type[manual|schedule|webhook|event|agent], triggered_by_id?, input jsonb, output jsonb, snapshot jsonb?, started_at, completed_at, error_message?`
- **workflow_step_runs**: `id, workflow_run_id, step_id, step_type, status, input jsonb, output jsonb, started_at, completed_at, error_message?`

## Agent runs & observability

- **agent_runs**: `id, agent_id, thread_id?, workflow_run_id? (the underlying compiled workflow run), status[queued|running|waiting_approval|completed|failed|cancelled], input jsonb, output jsonb, token_usage jsonb {prompt,completion,total}, estimated_cost numeric, error_message?, started_at, completed_at`
- **traces**: `id, org_id, run_type[agent|workflow], run_id, root_span_id?, status, started_at, completed_at`
- **spans**: `id, trace_id, parent_span_id?, type[agent_run|model_call|tool_call|workflow_step|knowledge_retrieval|agent_message], name, input jsonb, output jsonb, token_usage jsonb?, cost numeric?, status[running|success|error], error_message?, started_at, completed_at, duration_ms`

## Multi-agent communication (doc 05 has the full design)

- **conversations**: `id, org_id, type[human_agent|agent_agent], subject?, created_at`
- **conversation_participants**: `id, conversation_id, participant_type[human|agent], participant_id`
- **agent_messages**: `id, conversation_id, from_type[human|agent], from_id, to_type[human|agent], to_id, kind[task|query|notification|event|response], payload jsonb, priority[low|normal|high|urgent], correlation_id?, status[pending|delivered|processing|processed|failed], retry_count, max_retries, created_at, processed_at?, error_message?`
- **agent_events**: `id, org_id, type, source_agent_id, payload jsonb, created_at` (append-only event log other agents/workflows can subscribe to)

## Tasks

- **tasks**: `id, org_id, title, description, owner_type[human|agent], owner_id, created_by_type[human|agent], created_by_id, priority[low|normal|high|urgent], department_id?, project?, due_date?, status[open|in_progress|blocked|in_review|done|cancelled], depends_on_task_ids uuid[], output jsonb?, created_at, updated_at`

## Human approval / policy engine

- **policies**: `id, org_id, name, action_pattern, requires_approval boolean, approver_role?, conditions jsonb? (e.g. amount thresholds), created_at` — org-wide defaults; `agent_permissions` can be stricter per agent but never looser than an org policy marked `requires_approval=true`.
- **approvals**: `id, org_id, action_type, requested_by_type[agent], requested_by_id, workflow_run_id?, tool_execution_id?, payload jsonb, status[pending|approved|rejected|expired], policy_id?, approver_id?, created_at, resolved_at?`

## Scheduling

- **scheduled_jobs**: `id, org_id, target_type[agent|workflow], target_id, cron_expression?, run_once_at?, status[active|paused|disabled], last_run_at?, next_run_at?, created_by, created_at`

## Model credentials & secrets

- **model_credentials**: `id, org_id, provider[openai|anthropic|google|...], encrypted_api_key bytea, created_by, created_at` — AES-256-GCM, key material never in the DB.

## Audit

- **audit_logs**: `id, org_id, actor_type[human|agent|system], actor_id, action, target_type, target_id, payload jsonb, created_at` — every task/message/approval/agent-config mutation writes here; append-only, no updates/deletes.

## Indexing notes

- `knowledge_chunks.embedding`, `memory_message_embeddings.embedding`: HNSW index (pgvector `vector_cosine_ops`).
- `spans(trace_id, started_at)`, `agent_messages(to_type, to_id, status)`, `tasks(owner_type, owner_id, status)`: composite indexes for the dashboard's hot queries.
- All tenant tables: index on `org_id`, and (where on Supabase) RLS policy `org_id = current_org()`.
