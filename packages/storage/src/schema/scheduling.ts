import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { organizations, users } from "./tenancy";

export const scheduledJobTargetTypeEnum = pgEnum("scheduled_job_target_type", ["agent", "workflow"]);
export const scheduledJobStatusEnum = pgEnum("scheduled_job_status", ["active", "paused", "disabled"]);

export const scheduledJobs = pgTable("scheduled_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  targetType: scheduledJobTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  cronExpression: text("cron_expression"),
  runOnceAt: timestamp("run_once_at", { withTimezone: true }),
  status: scheduledJobStatusEnum("status").notNull().default("active"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
