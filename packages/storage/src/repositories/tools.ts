import { eq, and } from "drizzle-orm";
import type { ToolDefinition } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function createTool(orgId: string, createdBy: string, input: ToolDefinition & { authConfigEncrypted?: Buffer; builtinKey?: string }) {
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
      createdBy,
    })
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
  completedAt?: Date;
}) {
  const db = getDb();
  const [execution] = await db
    .insert(schema.toolExecutions)
    .values({
      toolId: input.toolId,
      agentId: input.agentId,
      runId: input.runId,
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
