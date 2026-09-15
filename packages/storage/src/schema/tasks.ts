import { pgTable, uuid, text, timestamp, jsonb, pgEnum, date } from "drizzle-orm/pg-core";
import { organizations, departments } from "./tenancy";
import { participantTypeEnum, messagePriorityEnum } from "./messaging";

export const taskStatusEnum = pgEnum("task_status", ["open", "in_progress", "blocked", "in_review", "done", "cancelled"]);

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ownerType: participantTypeEnum("owner_type").notNull(),
  ownerId: uuid("owner_id").notNull(),
  createdByType: participantTypeEnum("created_by_type").notNull(),
  createdById: uuid("created_by_id").notNull(),
  priority: messagePriorityEnum("priority").notNull().default("normal"),
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
  project: text("project"),
  dueDate: date("due_date"),
  status: taskStatusEnum("status").notNull().default("open"),
  dependsOnTaskIds: uuid("depends_on_task_ids").array().notNull().default([]),
  output: jsonb("output").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
