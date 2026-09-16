import { pgTable, uuid, text, timestamp, jsonb, pgEnum, customType, boolean } from "drizzle-orm/pg-core";
import { organizations, users } from "./tenancy";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const toolCategoryEnum = pgEnum("tool_category", [
  "http",
  "file",
  "search",
  "database",
  "communication",
  "knowledge",
  "agent",
  "custom",
]);

export const toolExecutionStatusEnum = pgEnum("tool_execution_status", ["success", "error"]);

export const tools = pgTable("tools", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: toolCategoryEnum("category").notNull(),
  inputSchema: jsonb("input_schema").$type<Record<string, unknown>>().notNull(),
  outputSchema: jsonb("output_schema").$type<Record<string, unknown>>(),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  authConfigEncrypted: bytea("auth_config_encrypted"),
  builtinKey: text("builtin_key"),
  /** Present only for org-defined custom tools (builtinKey null) — see @ai-agent/tools's custom-http executor. */
  executionConfig: jsonb("execution_config").$type<Record<string, unknown>>(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const toolExecutions = pgTable("tool_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  toolId: uuid("tool_id")
    .notNull()
    .references(() => tools.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id"),
  runId: uuid("run_id"),
  spanId: uuid("span_id"),
  input: jsonb("input").$type<unknown>(),
  output: jsonb("output").$type<unknown>(),
  status: toolExecutionStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
