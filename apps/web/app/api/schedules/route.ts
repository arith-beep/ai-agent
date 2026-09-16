import { NextResponse } from "next/server";
import { z } from "zod";
import { agentsRepo, workflowsRepo } from "@ai-agent/storage";
import { createScheduledJob, listScheduledJobs } from "@ai-agent/scheduler";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const schedules = await listScheduledJobs(ctx.orgId);
  return NextResponse.json({ schedules });
}

const createSchema = z
  .object({
    targetType: z.enum(["agent", "workflow"]),
    targetId: z.string().uuid(),
    cronExpression: z.string().optional(),
    runOnceAt: z.string().datetime().optional(),
  })
  .refine((v) => v.cronExpression || v.runOnceAt, { message: "Provide either a cron expression or a one-time run time." });

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const target =
    parsed.data.targetType === "agent"
      ? await agentsRepo.getAgentById(ctx.orgId, parsed.data.targetId)
      : await workflowsRepo.getWorkflow(parsed.data.targetId);
  if (!target || ("orgId" in target && target.orgId !== ctx.orgId)) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  try {
    const job = await createScheduledJob({
      orgId: ctx.orgId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      cronExpression: parsed.data.cronExpression,
      runOnceAt: parsed.data.runOnceAt ? new Date(parsed.data.runOnceAt) : undefined,
      createdBy: ctx.userId,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
