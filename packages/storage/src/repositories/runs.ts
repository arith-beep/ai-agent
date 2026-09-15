import { eq, and, desc } from "drizzle-orm";
import type { TokenUsage } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function createAgentRun(input: { agentId: string; threadId?: string; input: unknown }) {
  const db = getDb();
  const [run] = await db
    .insert(schema.agentRuns)
    .values({ agentId: input.agentId, threadId: input.threadId, input: input.input, status: "queued" })
    .returning();
  return run;
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

export async function listRunsForOrg(orgId: string, limit = 100) {
  const db = getDb();
  return db
    .select({ run: schema.agentRuns, agentName: schema.agents.name })
    .from(schema.agentRuns)
    .innerJoin(schema.agents, eq(schema.agents.id, schema.agentRuns.agentId))
    .where(eq(schema.agents.orgId, orgId))
    .orderBy(desc(schema.agentRuns.startedAt))
    .limit(limit);
}

export async function createTrace(orgId: string, runType: "agent" | "workflow", runId: string) {
  const db = getDb();
  const [trace] = await db.insert(schema.traces).values({ orgId, runType, runId, status: "running" }).returning();
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
