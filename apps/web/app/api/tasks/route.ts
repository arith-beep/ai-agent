import { NextResponse } from "next/server";
import { z } from "zod";
import { tasksRepo } from "@ai-agent/storage";
import { createTask } from "@ai-agent/tasks";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await tasksRepo.listTasksForOrg(ctx.orgId);
  return NextResponse.json({ tasks });
}

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ownerType: z.enum(["human", "agent"]),
  ownerId: z.string().uuid(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueDate: z.string().datetime().optional(),
  dependsOnTaskIds: z.array(z.string().uuid()).default([]),
});

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const task = await createTask({
    orgId: ctx.orgId,
    createdByType: "human",
    createdById: ctx.userId,
    ...parsed.data,
  });
  return NextResponse.json({ task }, { status: 201 });
}
