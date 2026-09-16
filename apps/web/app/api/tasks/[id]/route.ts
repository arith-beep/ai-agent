import { NextResponse } from "next/server";
import { z } from "zod";
import { tasksRepo } from "@ai-agent/storage";
import { transitionTask, TaskDependencyError } from "@ai-agent/tasks";
import { getApiContext } from "@/lib/api-session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const task = await tasksRepo.getTask(id);
  if (!task || task.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const dependencies = task.dependsOnTaskIds.length > 0 ? await tasksRepo.getTasksByIds(task.dependsOnTaskIds) : [];
  return NextResponse.json({ task, dependencies });
}

const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "blocked", "in_review", "done", "cancelled"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await tasksRepo.getTask(id);
  if (!existing || existing.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const task = await transitionTask(ctx.orgId, id, parsed.data.status, { type: "human", id: ctx.userId });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof TaskDependencyError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
