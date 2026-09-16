import { tasksRepo, auditRepo } from "@ai-agent/storage";
import { createTaskInputSchema, type CreateTaskInput, type TaskStatus } from "@ai-agent/shared-types";

export async function createTask(input: CreateTaskInput) {
  const validated = createTaskInputSchema.parse(input);
  const task = await tasksRepo.createTask(validated);
  await auditRepo.writeAuditLog({
    orgId: validated.orgId,
    actorType: validated.createdByType,
    actorId: validated.createdById,
    action: "task.created",
    targetType: "task",
    targetId: task.id,
    payload: { title: task.title, ownerType: task.ownerType, ownerId: task.ownerId },
  });
  return task;
}

export async function listTasksForOrg(orgId: string) {
  return tasksRepo.listTasksForOrg(orgId);
}

export async function listTasksForOwner(ownerType: "human" | "agent", ownerId: string) {
  return tasksRepo.listTasksForOwner(ownerType, ownerId);
}

const GATED_BY_DEPENDENCIES: TaskStatus[] = ["in_progress", "done"];

export class TaskDependencyError extends Error {}

export async function transitionTask(
  orgId: string,
  taskId: string,
  status: TaskStatus,
  actor: { type: "human" | "agent" | "system"; id?: string },
  output?: unknown,
) {
  if (GATED_BY_DEPENDENCIES.includes(status)) {
    const current = await tasksRepo.getTask(taskId);
    if (current && current.dependsOnTaskIds.length > 0) {
      const dependencies = await tasksRepo.getTasksByIds(current.dependsOnTaskIds);
      const unfinished = dependencies.filter((d) => d.status !== "done");
      if (unfinished.length > 0) {
        throw new TaskDependencyError(
          `Cannot move to "${status}" — ${unfinished.length} dependency task(s) are not done yet: ${unfinished.map((t) => t.title).join(", ")}.`,
        );
      }
    }
  }

  const task = await tasksRepo.updateTaskStatus(taskId, status, output);
  await auditRepo.writeAuditLog({
    orgId,
    actorType: actor.type,
    actorId: actor.id,
    action: "task.status_changed",
    targetType: "task",
    targetId: taskId,
    payload: { status },
  });
  return task;
}
