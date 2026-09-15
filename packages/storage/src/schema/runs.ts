import { pgTable, uuid, text, timestamp, jsonb, pgEnum, numeric, integer } from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { memoryThreads } from "./memory";
import { workflowRuns } from "./workflows";
import { organizations } from "./tenancy";

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "queued",
  "running",
  "waiting_approval",
  "completed",
  "failed",
  "cancelled",
]);

export const traceRunTypeEnum = pgEnum("trace_run_type", ["agent", "workflow"]);
export const traceStatusEnum = pgEnum("trace_status", ["running", "success", "error"]);
export const spanTypeEnum = pgEnum("span_type", [
  "agent_run",
  "model_call",
  "tool_call",
  "workflow_step",
  "knowledge_retrieval",
  "agent_message",
]);
export const spanStatusEnum = pgEnum("span_status", ["running", "success", "error"]);

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  threadId: uuid("thread_id").references(() => memoryThreads.id, { onDelete: "set null" }),
  workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id, { onDelete: "set null" }),
  status: agentRunStatusEnum("status").notNull().default("queued"),
  input: jsonb("input").$type<unknown>(),
  output: jsonb("output").$type<unknown>(),
  tokenUsage: jsonb("token_usage").$type<{ promptTokens: number; completionTokens: number; totalTokens: number }>(),
  estimatedCost: numeric("estimated_cost"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const traces = pgTable("traces", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  runType: traceRunTypeEnum("run_type").notNull(),
  runId: uuid("run_id").notNull(),
  rootSpanId: uuid("root_span_id"),
  status: traceStatusEnum("status").notNull().default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const spans = pgTable("spans", {
  id: uuid("id").primaryKey().defaultRandom(),
  traceId: uuid("trace_id")
    .notNull()
    .references(() => traces.id, { onDelete: "cascade" }),
  parentSpanId: uuid("parent_span_id"),
  type: spanTypeEnum("type").notNull(),
  name: text("name").notNull(),
  input: jsonb("input").$type<unknown>(),
  output: jsonb("output").$type<unknown>(),
  tokenUsage: jsonb("token_usage").$type<{ promptTokens: number; completionTokens: number; totalTokens: number }>(),
  cost: numeric("cost"),
  status: spanStatusEnum("status").notNull().default("running"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
});
