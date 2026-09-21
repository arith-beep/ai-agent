import { and, eq, gte } from "drizzle-orm";
import { getDb, schema } from "../db";

/**
 * AI Sales Manager domain repo. Always talks to the real database — unlike
 * salesRepo/toolsRepo (see ./index.ts), this is never wrapped by the
 * in-memory DEMO_MODE proxy. Requirement was real persistence for this
 * feature regardless of the Sales Agent product's demo fallback.
 */

// ---- Reps (roster) ----

export async function createRep(input: {
  orgId: string;
  name: string;
  email?: string;
  team?: string;
  startDate?: Date;
  notes?: string;
  isSeed?: boolean;
}) {
  const db = getDb();
  const [rep] = await db.insert(schema.salesReps).values(input).returning();
  return rep;
}

export async function listReps(orgId: string, filters: { status?: "active" | "inactive" } = {}) {
  const db = getDb();
  return db.query.salesReps.findMany({
    where: and(eq(schema.salesReps.orgId, orgId), filters.status ? eq(schema.salesReps.status, filters.status) : undefined),
    orderBy: (r, { asc }) => [asc(r.name)],
  });
}

export async function getRep(orgId: string, repId: string) {
  const db = getDb();
  return db.query.salesReps.findFirst({
    where: and(eq(schema.salesReps.id, repId), eq(schema.salesReps.orgId, orgId)),
  });
}

export async function updateRep(orgId: string, repId: string, patch: Partial<{ name: string; email: string | null; team: string | null; status: "active" | "inactive"; notes: string | null }>) {
  const db = getDb();
  const [rep] = await db
    .update(schema.salesReps)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.salesReps.id, repId), eq(schema.salesReps.orgId, orgId)))
    .returning();
  return rep;
}

// ---- Performance snapshots ----

export async function upsertSnapshot(input: {
  orgId: string;
  repId: string;
  date: Date;
  dials?: number;
  connects?: number;
  appointments?: number;
  sales?: number;
  talkTimeMinutes?: number;
  source?: "manual" | "import" | "crm";
  notes?: string;
  isSeed?: boolean;
}) {
  const db = getDb();
  const [snapshot] = await db
    .insert(schema.repPerformanceSnapshots)
    .values(input)
    .onConflictDoUpdate({
      target: [schema.repPerformanceSnapshots.repId, schema.repPerformanceSnapshots.date],
      set: {
        dials: input.dials ?? 0,
        connects: input.connects ?? 0,
        appointments: input.appointments ?? 0,
        sales: input.sales ?? 0,
        talkTimeMinutes: input.talkTimeMinutes ?? 0,
        source: input.source ?? "manual",
        notes: input.notes,
        updatedAt: new Date(),
      },
    })
    .returning();
  return snapshot;
}

export async function listSnapshotsForRep(repId: string, since?: Date) {
  const db = getDb();
  return db.query.repPerformanceSnapshots.findMany({
    where: and(eq(schema.repPerformanceSnapshots.repId, repId), since ? gte(schema.repPerformanceSnapshots.date, since) : undefined),
    orderBy: (s, { asc }) => [asc(s.date)],
  });
}

export async function listSnapshotsForOrg(orgId: string, since?: Date) {
  const db = getDb();
  return db.query.repPerformanceSnapshots.findMany({
    where: and(eq(schema.repPerformanceSnapshots.orgId, orgId), since ? gte(schema.repPerformanceSnapshots.date, since) : undefined),
    orderBy: (s, { asc }) => [asc(s.date)],
  });
}

/** Team totals for a window, plus each rep's own totals for the same window — used for the "vs. own baseline" comparisons the roleplay called for. */
export async function getTeamSnapshotSummary(orgId: string, since: Date) {
  const rows = await listSnapshotsForOrg(orgId, since);
  const byRep = new Map<string, { dials: number; connects: number; appointments: number; sales: number; talkTimeMinutes: number; days: number }>();
  const team = { dials: 0, connects: 0, appointments: 0, sales: 0, talkTimeMinutes: 0, days: 0 };
  for (const row of rows) {
    team.dials += row.dials;
    team.connects += row.connects;
    team.appointments += row.appointments;
    team.sales += row.sales;
    team.talkTimeMinutes += row.talkTimeMinutes;
    team.days += 1;
    const cur = byRep.get(row.repId) ?? { dials: 0, connects: 0, appointments: 0, sales: 0, talkTimeMinutes: 0, days: 0 };
    cur.dials += row.dials;
    cur.connects += row.connects;
    cur.appointments += row.appointments;
    cur.sales += row.sales;
    cur.talkTimeMinutes += row.talkTimeMinutes;
    cur.days += 1;
    byRep.set(row.repId, cur);
  }
  return { team, byRep };
}

// ---- Coaching sessions ----

export async function createCoachingSession(input: {
  orgId: string;
  repId: string;
  managerUserId?: string;
  diagnosedCause?: "effort" | "leads" | "confidence" | "skill" | "script" | "other";
  summary?: string;
  agreedFocus: string;
  followUpDate?: Date;
  isSeed?: boolean;
}) {
  const db = getDb();
  const [session] = await db.insert(schema.coachingSessions).values(input).returning();
  return session;
}

export async function listCoachingSessionsForRep(repId: string) {
  const db = getDb();
  return db.query.coachingSessions.findMany({
    where: eq(schema.coachingSessions.repId, repId),
    orderBy: (c, { desc }) => [desc(c.sessionDate)],
  });
}

export async function listCoachingSessionsForOrg(orgId: string) {
  const db = getDb();
  return db.query.coachingSessions.findMany({
    where: eq(schema.coachingSessions.orgId, orgId),
    orderBy: (c, { desc }) => [desc(c.sessionDate)],
  });
}

export async function updateCoachingOutcome(
  orgId: string,
  sessionId: string,
  outcome: "pending" | "worked" | "partially_worked" | "not_worked" | "escalated",
  outcomeNotes?: string,
) {
  const db = getDb();
  const [session] = await db
    .update(schema.coachingSessions)
    .set({ outcome, outcomeNotes, updatedAt: new Date() })
    .where(and(eq(schema.coachingSessions.id, sessionId), eq(schema.coachingSessions.orgId, orgId)))
    .returning();
  return session;
}

// ---- Open threads (commitment tracker) ----

export async function createOpenThread(input: {
  orgId: string;
  repId?: string;
  managerUserId?: string;
  description: string;
  category?: "commitment" | "follow_up" | "operational" | "other";
  dueAt?: Date;
  isSeed?: boolean;
}) {
  const db = getDb();
  const [thread] = await db.insert(schema.openThreads).values(input).returning();
  return thread;
}

export async function listOpenThreads(orgId: string, filters: { status?: "open" | "done" | "dropped"; repId?: string } = {}) {
  const db = getDb();
  return db.query.openThreads.findMany({
    where: and(
      eq(schema.openThreads.orgId, orgId),
      filters.status ? eq(schema.openThreads.status, filters.status) : undefined,
      filters.repId ? eq(schema.openThreads.repId, filters.repId) : undefined,
    ),
    orderBy: (t, { asc, desc }) => [asc(t.dueAt), desc(t.createdAt)],
  });
}

export async function setThreadStatus(orgId: string, threadId: string, status: "open" | "done" | "dropped") {
  const db = getDb();
  const [thread] = await db
    .update(schema.openThreads)
    .set({ status, resolvedAt: status === "open" ? null : new Date(), updatedAt: new Date() })
    .where(and(eq(schema.openThreads.id, threadId), eq(schema.openThreads.orgId, orgId)))
    .returning();
  return thread;
}

// ---- Compliance cases ----

export async function createComplianceCase(input: {
  orgId: string;
  repId: string;
  flaggedByUserId?: string;
  source?: "qa_review" | "complaint" | "manual" | "other";
  severity?: "low" | "medium" | "high" | "critical";
  description: string;
  isSeed?: boolean;
}) {
  const db = getDb();
  const [case_] = await db.insert(schema.complianceCases).values(input).returning();
  return case_;
}

export async function listComplianceCases(orgId: string, filters: { status?: "open" | "under_review" | "resolved" | "escalated"; repId?: string } = {}) {
  const db = getDb();
  return db.query.complianceCases.findMany({
    where: and(
      eq(schema.complianceCases.orgId, orgId),
      filters.status ? eq(schema.complianceCases.status, filters.status) : undefined,
      filters.repId ? eq(schema.complianceCases.repId, filters.repId) : undefined,
    ),
    orderBy: (c, { desc }) => [desc(c.flaggedAt)],
  });
}

export async function setComplianceCaseStatus(orgId: string, caseId: string, status: "open" | "under_review" | "escalated") {
  const db = getDb();
  const [case_] = await db
    .update(schema.complianceCases)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(schema.complianceCases.id, caseId), eq(schema.complianceCases.orgId, orgId)))
    .returning();
  return case_;
}

/**
 * The ONLY way a compliance case can be marked resolved. `resolvedByUserId`
 * is required (not optional) precisely so nothing — including the AI Manager
 * Agent — can resolve a compliance case without a real human user id attached.
 */
export async function resolveComplianceCase(orgId: string, caseId: string, resolvedByUserId: string, resolutionNotes: string) {
  const db = getDb();
  const [case_] = await db
    .update(schema.complianceCases)
    .set({ status: "resolved", resolvedByUserId, resolutionNotes, resolvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.complianceCases.id, caseId), eq(schema.complianceCases.orgId, orgId)))
    .returning();
  return case_;
}

// ---- Team focus areas ----

export async function createTeamFocusArea(input: {
  orgId: string;
  weekOf: Date;
  theme: string;
  rationale?: string;
  createdByUserId?: string;
  isSeed?: boolean;
}) {
  const db = getDb();
  const [focus] = await db.insert(schema.teamFocusAreas).values(input).returning();
  return focus;
}

export async function listTeamFocusAreas(orgId: string) {
  const db = getDb();
  return db.query.teamFocusAreas.findMany({
    where: eq(schema.teamFocusAreas.orgId, orgId),
    orderBy: (f, { desc }) => [desc(f.weekOf)],
  });
}

export async function getCurrentFocusArea(orgId: string) {
  const db = getDb();
  return db.query.teamFocusAreas.findFirst({
    where: eq(schema.teamFocusAreas.orgId, orgId),
    orderBy: (f, { desc }) => [desc(f.weekOf)],
  });
}

export async function updateFocusAreaAdoption(orgId: string, focusId: string, adoptionNotes: string) {
  const db = getDb();
  const [focus] = await db
    .update(schema.teamFocusAreas)
    .set({ adoptionNotes, updatedAt: new Date() })
    .where(and(eq(schema.teamFocusAreas.id, focusId), eq(schema.teamFocusAreas.orgId, orgId)))
    .returning();
  return focus;
}
