import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { organizations, users } from "./tenancy";

export const workflowStatusEnum = pgEnum("workflow_status", ["draft", "published", "archived"]);
export const workflowRunStatusEnum = pgEnum("workflow_run_status", [
  "queued",
  "running",
  "suspended",
  "completed",
  "failed",
  "cancelled",
]);
export const workflowTriggerTypeEnum = pgEnum("workflow_trigger_type", ["manual", "schedule", "webhook", "event", "agent"]);
export const workflowStepStatusEnum = pgEnum("workflow_step_status", ["queued", "running", "suspended", "completed", "failed", "skipped"]);

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  definition: jsonb("definition").$type<Record<string, unknown>>().notNull(),
  status: workflowStatusEnum("status").notNull().default("draft"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  status: workflowRunStatusEnum("status").notNull().default("queued"),
  triggeredByType: workflowTriggerTypeEnum("triggered_by_type").notNull().default("manual"),
  triggeredById: uuid("triggered_by_id"),
  input: jsonb("input").$type<unknown>(),
  output: jsonb("output").$type<unknown>(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});

export const workflowStepRuns = pgTable("workflow_step_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowRunId: uuid("workflow_run_id")
    .notNull()
    .references(() => workflowRuns.id, { onDelete: "cascade" }),
  stepId: text("step_id").notNull(),
  stepType: text("step_type").notNull(),
  status: workflowStepStatusEnum("status").notNull().default("queued"),
  input: jsonb("input").$type<unknown>(),
  output: jsonb("output").$type<unknown>(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});
