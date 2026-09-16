import { eq, and, desc, gte, count, sql } from "drizzle-orm";
import type { TokenUsage } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function createAgentRun(input: { agentId: string; threadId?: string; input: unknown }) {
  const db = getDb();
  const [run] = await db
    .insert(schema.agentRuns)
    .values({ agentId: input.agentId, threadId: input.threadId, input: input.input, status: "queued" })
    .returning();
  if (!run) throw new Error("Failed to create agent run");
  return run;
}

export async function linkRunThread(runId: string, threadId: string) {
  const db = getDb();
  await db.update(schema.agentRuns).set({ threadId }).where(eq(schema.agentRuns.id, runId));
}

export async function setAgentRunStatus(runId: string, status: (typeof schema.agentRunStatusEnum.enumValues)[number]) {
  const db = getDb();
  const [updated] = await db.update(schema.agentRuns).set({ status }).where(eq(schema.agentRuns.id, runId)).returning();
  return updated;
}

export async function completeAgentRun(
  runId: string,
  result: { output: unknown; tokenUsage: TokenUsage; estimatedCost: number; status?: "completed" | "failed"; errorMessage?: string },
) {
  const db = getDb();
  const [updated] = await db
    .update(schema.agentRuns)
    .set({
      status: result.status ?? "completed",
      output: result.output,
      tokenUsage: result.tokenUsage,
      estimatedCost: String(result.estimatedCost),
      errorMessage: result.errorMessage,
      completedAt: new Date(),
    })
    .where(eq(schema.agentRuns.id, runId))
    .returning();
  return updated;
}

export async function getAgentRun(runId: string) {
  const db = getDb();
  return db.query.agentRuns.findFirst({ where: eq(schema.agentRuns.id, runId) });
}

export async function listRunsForAgent(agentId: string, limit = 50) {
  const db = getDb();
  return db.query.agentRuns.findMany({
    where: eq(schema.agentRuns.agentId, agentId),
    orderBy: (r, { desc: d }) => [d(r.startedAt)],
    limit,
  });
}

export async function listRunsForOrg(
  orgId: string,
  limit = 100,
  filters?: { status?: (typeof schema.agentRunStatusEnum.enumValues)[number]; agentId?: string },
) {
  const db = getDb();
  const conditions = [eq(schema.agents.orgId, orgId)];
  if (filters?.status) conditions.push(eq(schema.agentRuns.status, filters.status));
  if (filters?.agentId) conditions.push(eq(schema.agentRuns.agentId, filters.agentId));
  return db
    .select({ run: schema.agentRuns, agentName: schema.agents.name })
    .from(schema.agentRuns)
    .innerJoin(schema.agents, eq(schema.agents.id, schema.agentRuns.agentId))
    .where(and(...conditions))
    .orderBy(desc(schema.agentRuns.startedAt))
    .limit(limit);
}

export interface AgentRunStats {
  byStatus: { status: string; count: number }[];
  byDay: { day: string; status: string; count: number }[];
  byModel: { provider: string; model: string; count: number; totalCost: number; totalTokens: number }[];
  totals: { count: number; totalCost: number; totalTokens: number; avgDurationMs: number | null };
}

/** Real aggregate queries over agent_runs for the Analytics dashboard — nothing here is synthesized. */
export async function getAgentRunStatsForOrg(orgId: string, since: Date): Promise<AgentRunStats> {
  const db = getDb();
  const scope = and(eq(schema.agents.orgId, orgId), gte(schema.agentRuns.startedAt, since));

  const byStatusRows = await db
    .select({ status: schema.agentRuns.status, count: count() })
    .from(schema.agentRuns)
    .innerJoin(schema.agents, eq(schema.agents.id, schema.agentRuns.agentId))
    .where(scope)
    .groupBy(schema.agentRuns.status);

  const byDayRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${schema.agentRuns.startedAt}), 'YYYY-MM-DD')`,
      status: schema.agentRuns.status,
      count: count(),
    })
    .from(schema.agentRuns)
    .innerJoin(schema.agents, eq(schema.agents.id, schema.agentRuns.agentId))
    .where(scope)
    .groupBy(sql`date_trunc('day', ${schema.agentRuns.startedAt})`, schema.agentRuns.status)
    .orderBy(sql`date_trunc('day', ${schema.agentRuns.startedAt})`);

  const byModelRows = await db
    .select({
      provider: schema.agents.modelProvider,
      model: schema.agents.modelName,
      count: count(),
      totalCost: sql<string>`coalesce(sum(${schema.agentRuns.estimatedCost}), 0)`,
      totalTokens: sql<string>`coalesce(sum((${schema.agentRuns.tokenUsage}->>'totalTokens')::int), 0)`,
    })
    .from(schema.agentRuns)
    .innerJoin(schema.agents, eq(schema.agents.id, schema.agentRuns.agentId))
    .where(scope)
    .groupBy(schema.agents.modelProvider, schema.agents.modelName)
    .orderBy(sql`sum(${schema.agentRuns.estimatedCost}) desc`);

  const [totalsRow] = await db
    .select({
      count: count(),
      totalCost: sql<string>`coalesce(sum(${schema.agentRuns.estimatedCost}), 0)`,
      totalTokens: sql<string>`coalesce(sum((${schema.agentRuns.tokenUsage}->>'totalTokens')::int), 0)`,
      avgDurationMs: sql<string | null>`avg(extract(epoch from (${schema.agentRuns.completedAt} - ${schema.agentRuns.startedAt})) * 1000)`,
    })
    .from(schema.agentRuns)
    .innerJoin(schema.agents, eq(schema.agents.id, schema.agentRuns.agentId))
    .where(scope);

  return {
    byStatus: byStatusRows,
    byDay: byDayRows,
    byModel: byModelRows.map((r) => ({ provider: r.provider, model: r.model, count: r.count, totalCost: Number(r.totalCost), totalTokens: Number(r.totalTokens) })),
    totals: {
      count: totalsRow?.count ?? 0,
      totalCost: Number(totalsRow?.totalCost ?? 0),
      totalTokens: Number(totalsRow?.totalTokens ?? 0),
      avgDurationMs: totalsRow?.avgDurationMs ? Number(totalsRow.avgDurationMs) : null,
    },
  };
}

export async function createTrace(orgId: string, runType: "agent" | "workflow", runId: string) {
  const db = getDb();
  const [trace] = await db.insert(schema.traces).values({ orgId, runType, runId, status: "running" }).returning();
  if (!trace) throw new Error("Failed to create trace");
  return trace;
}

export async function completeTrace(traceId: string, status: "success" | "error") {
  const db = getDb();
  await db.update(schema.traces).set({ status, completedAt: new Date() }).where(eq(schema.traces.id, traceId));
}

export async function getTraceForRun(runType: "agent" | "workflow", runId: string) {
  const db = getDb();
  return db.query.traces.findFirst({ where: and(eq(schema.traces.runType, runType), eq(schema.traces.runId, runId)) });
}

export async function startSpan(input: {
  traceId: string;
  parentSpanId?: string;
  type: (typeof schema.spanTypeEnum.enumValues)[number];
  name: string;
  input?: unknown;
}) {
  const db = getDb();
  const [span] = await db
    .insert(schema.spans)
    .values({
      traceId: input.traceId,
      parentSpanId: input.parentSpanId,
      type: input.type,
      name: input.name,
      input: input.input,
      status: "running",
    })
    .returning();
  if (!span) throw new Error("Failed to create span");
  return span;
}

export async function completeSpan(
  spanId: string,
  result: { output?: unknown; status: "success" | "error"; errorMessage?: string; tokenUsage?: TokenUsage; cost?: number },
) {
  const db = getDb();
  const span = await db.query.spans.findFirst({ where: eq(schema.spans.id, spanId) });
  const startedAt = span?.startedAt ?? new Date();
  const completedAt = new Date();
  const [updated] = await db
    .update(schema.spans)
    .set({
      output: result.output,
      status: result.status,
      errorMessage: result.errorMessage,
      tokenUsage: result.tokenUsage,
      cost: result.cost !== undefined ? String(result.cost) : undefined,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    })
    .where(eq(schema.spans.id, spanId))
    .returning();
  return updated;
}

export async function listSpansForTrace(traceId: string) {
  const db = getDb();
  return db.query.spans.findMany({ where: eq(schema.spans.traceId, traceId), orderBy: (s, { asc }) => [asc(s.startedAt)] });
}
