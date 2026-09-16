import { pgTable, uuid, text, timestamp, jsonb, pgEnum, boolean } from "drizzle-orm/pg-core";
import { organizations } from "./tenancy";
import { participantTypeEnum } from "./messaging";

export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "expired"]);

export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  actionPattern: text("action_pattern").notNull(),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approverRole: text("approver_role"),
  conditions: jsonb("conditions").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  requestedByType: participantTypeEnum("requested_by_type").notNull(),
  requestedById: uuid("requested_by_id").notNull(),
  workflowRunId: uuid("workflow_run_id"),
  toolExecutionId: uuid("tool_execution_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: approvalStatusEnum("status").notNull().default("pending"),
  approverRole: text("approver_role"),
  policyId: uuid("policy_id").references(() => policies.id, { onDelete: "set null" }),
  approverId: uuid("approver_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
