import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations, users } from "./tenancy";

/**
 * AI Sales Manager domain — distinct from `sales_agents` (the customer-facing
 * AI bot product). This domain models the HUMAN telesales team a Sales
 * Manager runs: the roster, their performance history, coaching, open
 * commitments, compliance cases, and weekly team focus areas. Deliberately
 * uses "rep" everywhere instead of "agent" — "agent" already means an AI bot
 * config row (`sales_agents`) and a generic actor-type value elsewhere in
 * this codebase; reusing it for a human employee would collide with both.
 *
 * No CRM/dialer is integrated yet. `rep_performance_snapshots.source`
 * exists specifically so a future CRM/dialer feed can write rows the same
 * way manual entry does today, without a schema change.
 */

export const repStatusEnum = pgEnum("rep_status", ["active", "inactive"]);

export const coachingCauseEnum = pgEnum("coaching_cause", ["effort", "leads", "confidence", "skill", "script", "other"]);
export const coachingOutcomeEnum = pgEnum("coaching_outcome", ["pending", "worked", "partially_worked", "not_worked", "escalated"]);

export const openThreadCategoryEnum = pgEnum("open_thread_category", ["commitment", "follow_up", "operational", "other"]);
export const openThreadStatusEnum = pgEnum("open_thread_status", ["open", "done", "dropped"]);

export const complianceSeverityEnum = pgEnum("compliance_severity", ["low", "medium", "high", "critical"]);
export const complianceCaseStatusEnum = pgEnum("compliance_case_status", ["open", "under_review", "resolved", "escalated"]);

export const salesReps = pgTable(
  "sales_reps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    team: text("team"),
    status: repStatusEnum("status").notNull().default("active"),
    startDate: timestamp("start_date", { withTimezone: true }),
    notes: text("notes"),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sales_reps_org_idx").on(table.orgId)],
);

export const repPerformanceSnapshots = pgTable(
  "rep_performance_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    repId: uuid("rep_id")
      .notNull()
      .references(() => salesReps.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).notNull(),
    dials: integer("dials").notNull().default(0),
    connects: integer("connects").notNull().default(0),
    appointments: integer("appointments").notNull().default(0),
    sales: integer("sales").notNull().default(0),
    talkTimeMinutes: integer("talk_time_minutes").notNull().default(0),
    source: text("source", { enum: ["manual", "import", "crm"] }).notNull().default("manual"),
    notes: text("notes"),
    isSeed: boolean("is_seed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("rep_snapshots_rep_date_idx").on(table.repId, table.date)],
);

export const coachingSessions = pgTable("coaching_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  repId: uuid("rep_id")
    .notNull()
    .references(() => salesReps.id, { onDelete: "cascade" }),
  managerUserId: uuid("manager_user_id").references(() => users.id, { onDelete: "set null" }),
  sessionDate: timestamp("session_date", { withTimezone: true }).notNull().defaultNow(),
  diagnosedCause: coachingCauseEnum("diagnosed_cause"),
  summary: text("summary"),
  agreedFocus: text("agreed_focus").notNull(),
  followUpDate: timestamp("follow_up_date", { withTimezone: true }),
  outcome: coachingOutcomeEnum("outcome").notNull().default("pending"),
  outcomeNotes: text("outcome_notes"),
  isSeed: boolean("is_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const openThreads = pgTable("open_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  repId: uuid("rep_id").references(() => salesReps.id, { onDelete: "cascade" }),
  managerUserId: uuid("manager_user_id").references(() => users.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  category: openThreadCategoryEnum("category").notNull().default("commitment"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  status: openThreadStatusEnum("status").notNull().default("open"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  isSeed: boolean("is_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** `resolvedByUserId` is required by the repo layer whenever status moves to "resolved" — this must always be a human, never set by the AI unattended. */
export const complianceCases = pgTable("compliance_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  repId: uuid("rep_id")
    .notNull()
    .references(() => salesReps.id, { onDelete: "cascade" }),
  flaggedByUserId: uuid("flagged_by_user_id").references(() => users.id, { onDelete: "set null" }),
  flaggedAt: timestamp("flagged_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source", { enum: ["qa_review", "complaint", "manual", "other"] }).notNull().default("manual"),
  severity: complianceSeverityEnum("severity").notNull().default("medium"),
  description: text("description").notNull(),
  status: complianceCaseStatusEnum("status").notNull().default("open"),
  resolutionNotes: text("resolution_notes"),
  resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  isSeed: boolean("is_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamFocusAreas = pgTable("team_focus_areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  weekOf: timestamp("week_of", { withTimezone: true }).notNull(),
  theme: text("theme").notNull(),
  rationale: text("rationale"),
  adoptionNotes: text("adoption_notes"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  isSeed: boolean("is_seed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
