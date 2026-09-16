import { eq, and, inArray } from "drizzle-orm";
import type { CreateTaskInput, TaskStatus } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function createTask(input: CreateTaskInput) {
  const db = getDb();
  const [task] = await db
    .insert(schema.tasks)
    .values({
      orgId: input.orgId,
      title: input.title,
      description: input.description,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      createdByType: input.createdByType,
      createdById: input.createdById,
      priority: input.priority,
      departmentId: input.departmentId,
      project: input.project,
      dueDate: input.dueDate,
      dependsOnTaskIds: input.dependsOnTaskIds,
    })
    .returning();
  if (!task) throw new Error("Failed to create task");
  return task;
}

export async function listTasksForOrg(orgId: string) {
  const db = getDb();
  return db.query.tasks.findMany({ where: eq(schema.tasks.orgId, orgId), orderBy: (t, { desc }) => [desc(t.createdAt)] });
}

export async function listTasksForOwner(ownerType: "human" | "agent", ownerId: string) {
  const db = getDb();
  return db.query.tasks.findMany({
    where: and(eq(schema.tasks.ownerType, ownerType), eq(schema.tasks.ownerId, ownerId)),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function getTask(taskId: string) {
  const db = getDb();
  return db.query.tasks.findFirst({ where: eq(schema.tasks.id, taskId) });
}

export async function getTasksByIds(taskIds: string[]) {
  const db = getDb();
  if (taskIds.length === 0) return [];
  return db.query.tasks.findMany({ where: inArray(schema.tasks.id, taskIds) });
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, output?: unknown) {
  const db = getDb();
  const [updated] = await db
    .update(schema.tasks)
    .set({ status, output, updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId))
    .returning();
  return updated;
}
