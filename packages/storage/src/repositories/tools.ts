import { eq, and, isNull, count, sql } from "drizzle-orm";
import type { ToolDefinition } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function createTool(
  orgId: string,
  createdBy: string,
  input: ToolDefinition & { authConfigEncrypted?: Buffer; builtinKey?: string; executionConfig?: Record<string, unknown> },
) {
  const db = getDb();
  const [tool] = await db
    .insert(schema.tools)
    .values({
      orgId,
      name: input.name,
      description: input.description,
      category: input.category,
      inputSchema: input.inputSchema,
      outputSchema: input.outputSchema,
      requiresApproval: input.requiresApproval,
      authConfigEncrypted: input.authConfigEncrypted,
      builtinKey: input.builtinKey,
      executionConfig: input.executionConfig,
      createdBy,
    })
    .returning();
  return tool;
}

export async function updateCustomTool(
  orgId: string,
  toolId: string,
  input: Partial<ToolDefinition> & { executionConfig?: Record<string, unknown> },
) {
  const db = getDb();
  const patch: Partial<typeof schema.tools.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined) patch.category = input.category;
  if (input.inputSchema !== undefined) patch.inputSchema = input.inputSchema;
  if (input.outputSchema !== undefined) patch.outputSchema = input.outputSchema;
  if (input.requiresApproval !== undefined) patch.requiresApproval = input.requiresApproval;
  if (input.executionConfig !== undefined) patch.executionConfig = input.executionConfig;

  const [tool] = await db
    .update(schema.tools)
    // Only ever applied to org-defined custom tools — a builtin's identity/schema is owned by
    // its code (packages/tools/src/builtin), not editable through this path.
    .set(patch)
    .where(and(eq(schema.tools.id, toolId), eq(schema.tools.orgId, orgId), isNull(schema.tools.builtinKey)))
    .returning();
  return tool;
}

export async function listTools(orgId: string) {
  const db = getDb();
  return db.query.tools.findMany({ where: eq(schema.tools.orgId, orgId), orderBy: (t, { asc }) => [asc(t.name)] });
}

export async function getToolById(orgId: string, toolId: string) {
  const db = getDb();
  return db.query.tools.findFirst({ where: and(eq(schema.tools.id, toolId), eq(schema.tools.orgId, orgId)) });
}

export async function setToolAuthConfig(orgId: string, toolId: string, encrypted: Buffer) {
  const db = getDb();
  const [tool] = await db
    .update(schema.tools)
    .set({ authConfigEncrypted: encrypted })
    .where(and(eq(schema.tools.id, toolId), eq(schema.tools.orgId, orgId)))
    .returning();
  return tool;
}

export async function deleteTool(orgId: string, toolId: string) {
  const db = getDb();
  await db.delete(schema.tools).where(and(eq(schema.tools.id, toolId), eq(schema.tools.orgId, orgId)));
}

export async function recordToolExecution(input: {
  toolId: string;
  agentId?: string;
  runId?: string;
  spanId?: string;
  input: unknown;
  output?: unknown;
  status: "success" | "error";
  errorMessage?: string;
  /** When the call actually started — without this, started_at defaults to insert time (i.e. *after* the call already ran, since this is a single insert for a call that has already finished), making every duration meaningless and occasionally negative. */
  startedAt: Date;
  completedAt?: Date;
}) {
  const db = getDb();
  const [execution] = await db
    .insert(schema.toolExecutions)
    .values({
      toolId: input.toolId,
      agentId: input.agentId,
      runId: input.runId,
      startedAt: input.startedAt,
      spanId: input.spanId,
      input: input.input,
      output: input.output,
      status: input.status,
      errorMessage: input.errorMessage,
      completedAt: input.completedAt ?? new Date(),
    })
    .returning();
  return execution;
}

export async function listToolExecutions(toolId: string, limit = 50) {
  const db = getDb();
  return db.query.toolExecutions.findMany({
    where: eq(schema.toolExecutions.toolId, toolId),
    orderBy: (t, { desc }) => [desc(t.startedAt)],
    limit,
  });
}

export interface ToolUsageStats {
  toolId: string;
  toolName: string;
  category: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgDurationMs: number | null;
}

/** Real aggregate over tool_executions for the Analytics dashboard — one row per tool that has been called at least once. */
export async function getToolUsageStatsForOrg(orgId: string): Promise<ToolUsageStats[]> {
  const db = getDb();
  const rows = await db
    .select({
      toolId: schema.tools.id,
      toolName: schema.tools.name,
      category: schema.tools.category,
      totalCalls: count(),
      successCalls: sql<string>`count(*) filter (where ${schema.toolExecutions.status} = 'success')`,
      errorCalls: sql<string>`count(*) filter (where ${schema.toolExecutions.status} = 'error')`,
      avgDurationMs: sql<string | null>`avg(extract(epoch from (${schema.toolExecutions.completedAt} - ${schema.toolExecutions.startedAt})) * 1000)`,
    })
    .from(schema.toolExecutions)
    .innerJoin(schema.tools, eq(schema.tools.id, schema.toolExecutions.toolId))
    .where(eq(schema.tools.orgId, orgId))
    .groupBy(schema.tools.id, schema.tools.name, schema.tools.category)
    .orderBy(sql`count(*) desc`);

  return rows.map((r) => ({
    toolId: r.toolId,
    toolName: r.toolName,
    category: r.category,
    totalCalls: r.totalCalls,
    successCalls: Number(r.successCalls),
    errorCalls: Number(r.errorCalls),
    avgDurationMs: r.avgDurationMs ? Number(r.avgDurationMs) : null,
  }));
}
