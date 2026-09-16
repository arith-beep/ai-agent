import { eq, and, inArray } from "drizzle-orm";
import type { WorkflowDefinition, WorkflowSnapshot } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function createWorkflow(input: {
  orgId: string;
  createdBy: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
}) {
  const db = getDb();
  const [workflow] = await db
    .insert(schema.workflows)
    .values({
      orgId: input.orgId,
      name: input.name,
      description: input.description,
      definition: input.definition as unknown as Record<string, unknown>,
      status: "draft",
      createdBy: input.createdBy,
    })
    .returning();
  if (!workflow) throw new Error("Failed to create workflow");
  return workflow;
}

export async function updateWorkflow(
  workflowId: string,
  input: { name?: string; description?: string; definition?: WorkflowDefinition; status?: (typeof schema.workflowStatusEnum.enumValues)[number] },
) {
  const db = getDb();
  const patch: Partial<typeof schema.workflows.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.definition !== undefined) patch.definition = input.definition as unknown as Record<string, unknown>;
  if (input.status !== undefined) patch.status = input.status;

  const [workflow] = await db.update(schema.workflows).set(patch).where(eq(schema.workflows.id, workflowId)).returning();
  return workflow;
}

export async function listWorkflows(orgId: string) {
  const db = getDb();
  return db.query.workflows.findMany({ where: eq(schema.workflows.orgId, orgId) });
}

export async function getWorkflow(workflowId: string) {
  const db = getDb();
  return db.query.workflows.findFirst({ where: eq(schema.workflows.id, workflowId) });
}

export async function createWorkflowRun(input: {
  workflowId: string;
  input: unknown;
  triggeredByType: (typeof schema.workflowTriggerTypeEnum.enumValues)[number];
  triggeredById?: string;
}) {
  const db = getDb();
  const [run] = await db
    .insert(schema.workflowRuns)
    .values({
      workflowId: input.workflowId,
      input: input.input,
      triggeredByType: input.triggeredByType,
      triggeredById: input.triggeredById,
      status: "queued",
    })
    .returning();
  if (!run) throw new Error("Failed to create workflow run");
  return run;
}

export async function listWorkflowRuns(workflowId: string, limit = 50) {
  const db = getDb();
  return db.query.workflowRuns.findMany({
    where: eq(schema.workflowRuns.workflowId, workflowId),
    orderBy: (r, { desc }) => [desc(r.startedAt)],
    limit,
  });
}

export async function listWorkflowRunsForOrg(
  orgId: string,
  options?: { statuses?: (typeof schema.workflowRunStatusEnum.enumValues)[number][]; limit?: number },
) {
  const db = getDb();
  const orgWorkflows = await db.query.workflows.findMany({
    where: eq(schema.workflows.orgId, orgId),
    columns: { id: true, name: true },
  });
  if (orgWorkflows.length === 0) return [];
  const workflowIds = orgWorkflows.map((w) => w.id);
  const nameById = new Map(orgWorkflows.map((w) => [w.id, w.name]));

  const conditions = [inArray(schema.workflowRuns.workflowId, workflowIds)];
  if (options?.statuses && options.statuses.length > 0) {
    conditions.push(inArray(schema.workflowRuns.status, options.statuses));
  }

  const runs = await db.query.workflowRuns.findMany({
    where: and(...conditions),
    orderBy: (r, { desc: descOrder }) => [descOrder(r.startedAt)],
    limit: options?.limit ?? 50,
  });

  return runs.map((run) => ({
    run,
    workflowId: run.workflowId,
    workflowName: nameById.get(run.workflowId) ?? "Unknown workflow",
  }));
}

export async function getWorkflowRun(runId: string) {
  const db = getDb();
  return db.query.workflowRuns.findFirst({ where: eq(schema.workflowRuns.id, runId) });
}

export async function setWorkflowRunStatus(
  runId: string,
  status: (typeof schema.workflowRunStatusEnum.enumValues)[number],
  extra?: { output?: unknown; errorMessage?: string; snapshot?: WorkflowSnapshot | null },
) {
  const db = getDb();
  const [updated] = await db
    .update(schema.workflowRuns)
    .set({
      status,
      output: extra?.output,
      errorMessage: extra?.errorMessage,
      snapshot: extra?.snapshot === null ? null : (extra?.snapshot as unknown as Record<string, unknown> | undefined),
      completedAt: status === "completed" || status === "failed" || status === "cancelled" ? new Date() : undefined,
    })
    .where(eq(schema.workflowRuns.id, runId))
    .returning();
  return updated;
}

export async function recordStepRun(input: {
  workflowRunId: string;
  stepId: string;
  stepType: string;
  status: (typeof schema.workflowStepStatusEnum.enumValues)[number];
  input?: unknown;
  output?: unknown;
  errorMessage?: string;
}) {
  const db = getDb();
  const [step] = await db
    .insert(schema.workflowStepRuns)
    .values({
      workflowRunId: input.workflowRunId,
      stepId: input.stepId,
      stepType: input.stepType,
      status: input.status,
      input: input.input,
      output: input.output,
      errorMessage: input.errorMessage,
      completedAt: input.status === "completed" || input.status === "failed" ? new Date() : undefined,
    })
    .returning();
  return step;
}

export async function listStepRuns(workflowRunId: string) {
  const db = getDb();
  return db.query.workflowStepRuns.findMany({
    where: eq(schema.workflowStepRuns.workflowRunId, workflowRunId),
    orderBy: (s, { asc }) => [asc(s.startedAt)],
  });
}
