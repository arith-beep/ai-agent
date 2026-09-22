import { tool } from "ai";
import { z } from "zod";
import { managerRepo, managerInsights } from "@ai-agent/storage";
import { Evidence } from "./evidence";

/**
 * Every tool here is read-only — each one calls exactly one managerRepo
 * read function and nothing else. There is no write-capable tool anywhere
 * in this file, and there must never be one: the Manager Agent prepares
 * material for a human, it never acts on the roster/coaching/compliance/
 * threads/focus tables itself. (Persisting the agent's own generated
 * output happens in runner.ts, via application code, not a tool call.)
 */

const SNAPSHOT_WINDOW_DAYS = 14;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function buildManagerTools(orgId: string, evidence: Evidence) {
  return {
    get_team_snapshot: tool({
      description: "Get every active rep on the roster and the team's aggregate performance over the last 14 days. Use this first to see who's on the team.",
      parameters: z.object({}),
      execute: async () => {
        const reps = await managerRepo.listReps(orgId, { status: "active" });
        const snapshots = await managerRepo.listSnapshotsForOrg(orgId, daysAgo(SNAPSHOT_WINDOW_DAYS));
        for (const r of reps) evidence.reps.set(r.id, { repId: r.id, name: r.name, team: r.team, status: r.status });

        const byRep = managerInsights.groupByRep(snapshots);
        for (const rep of reps) {
          const insight = managerInsights.analyzeRepTrend(byRep.get(rep.id) ?? []);
          if (insight) evidence.trends.set(rep.id, insight);
        }

        const team = snapshots.reduce(
          (acc, s) => {
            acc.dials += s.dials;
            acc.connects += s.connects;
            acc.appointments += s.appointments;
            acc.sales += s.sales;
            return acc;
          },
          { dials: 0, connects: 0, appointments: 0, sales: 0 },
        );

        const result = {
          reps: reps.map((r) => ({ repId: r.id, name: r.name, team: r.team })),
          teamTotals14d: team,
          repTrends: [...evidence.trends.values()],
        };
        evidence.toolCallLog.push({ name: "get_team_snapshot", input: {}, resultSummary: `${reps.length} reps, ${snapshots.length} snapshot rows` });
        return result;
      },
    }),

    get_coaching_history: tool({
      description: "Get the full coaching session history for a specific rep, including outcomes of past sessions. Use this before proposing a new coaching focus, to check whether this has come up before.",
      parameters: z.object({ repId: z.string().uuid() }),
      execute: async ({ repId }) => {
        const sessions = await managerRepo.listCoachingSessionsForRep(repId);
        for (const s of sessions) {
          evidence.coachingSessions.set(s.id, {
            sessionId: s.id,
            repId: s.repId,
            sessionDate: s.sessionDate.toISOString(),
            diagnosedCause: s.diagnosedCause,
            agreedFocus: s.agreedFocus,
            outcome: s.outcome,
            outcomeNotes: s.outcomeNotes,
          });
        }
        evidence.toolCallLog.push({ name: "get_coaching_history", input: { repId }, resultSummary: `${sessions.length} sessions for rep ${repId}` });
        return { repId, sessions: [...evidence.coachingSessions.values()].filter((s) => s.repId === repId) };
      },
    }),

    list_open_threads: tool({
      description: "List open commitment/follow-up/operational threads, optionally filtered to one rep. Use this to check for unresolved commitments.",
      parameters: z.object({ repId: z.string().uuid().optional() }),
      execute: async ({ repId }) => {
        const threads = await managerRepo.listOpenThreads(orgId, { status: "open", repId });
        for (const t of threads) {
          evidence.threads.set(t.id, { threadId: t.id, repId: t.repId, description: t.description, category: t.category, dueAt: t.dueAt ? t.dueAt.toISOString() : null });
        }
        evidence.toolCallLog.push({ name: "list_open_threads", input: { repId }, resultSummary: `${threads.length} open threads` });
        return { threads: threads.map((t) => ({ threadId: t.id, repId: t.repId, description: t.description, category: t.category, dueAt: t.dueAt })) };
      },
    }),

    list_compliance_cases: tool({
      description: "List compliance cases, optionally filtered by status (default: open) or to one rep. Compliance always takes priority over everything else.",
      parameters: z.object({
        status: z.enum(["open", "under_review", "resolved", "escalated"]).optional().describe("Defaults to open if omitted"),
        repId: z.string().uuid().optional(),
      }),
      execute: async ({ status, repId }) => {
        const cases = await managerRepo.listComplianceCases(orgId, { status: status ?? "open", repId });
        for (const c of cases) {
          evidence.cases.set(c.id, { caseId: c.id, repId: c.repId, severity: c.severity, status: c.status, description: c.description });
        }
        evidence.toolCallLog.push({ name: "list_compliance_cases", input: { status, repId }, resultSummary: `${cases.length} cases` });
        return { cases: cases.map((c) => ({ caseId: c.id, repId: c.repId, severity: c.severity, status: c.status, description: c.description })) };
      },
    }),

    get_current_focus_area: tool({
      description: "Get the team's current weekly focus area, if one is set.",
      parameters: z.object({}),
      execute: async () => {
        const focus = await managerRepo.getCurrentFocusArea(orgId);
        evidence.focusArea = focus ? { theme: focus.theme, rationale: focus.rationale } : null;
        evidence.toolCallLog.push({ name: "get_current_focus_area", input: {}, resultSummary: focus ? focus.theme : "none set" });
        return { focusArea: evidence.focusArea };
      },
    }),

    get_previous_brief: tool({
      description: "Get the most recently generated brief of the given type (morning_brief or coaching_prep for a specific rep), for continuity with what was already said. Returns null if none exists yet.",
      parameters: z.object({ type: z.enum(["morning_brief", "coaching_prep"]), repId: z.string().uuid().optional() }),
      execute: async ({ type, repId }) => {
        const brief = await managerRepo.getLatestBrief(orgId, type, repId);
        const summary = brief ? JSON.stringify(brief.content) : null;
        evidence.previousBriefSummary = summary;
        evidence.toolCallLog.push({ name: "get_previous_brief", input: { type, repId }, resultSummary: brief ? `found, generated ${brief.generatedAt.toISOString()}` : "none found" });
        return { found: Boolean(brief), generatedAt: brief?.generatedAt.toISOString() ?? null, content: brief?.content ?? null };
      },
    }),
  };
}
