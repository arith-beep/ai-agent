import { NextResponse } from "next/server";
import { z } from "zod";
import { policyRepo, toolsRepo, runsRepo } from "@ai-agent/storage";
import { executeTool } from "@ai-agent/tools";
import { transitionTask } from "@ai-agent/tasks";
import { getQueues } from "@ai-agent/queue";
import { requireOrgRole, ForbiddenError, type OrgRole } from "@ai-agent/auth";
import { getApiContext } from "@/lib/api-session";

const resolveSchema = z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().optional() });
const TASK_STATUSES = ["open", "in_progress", "blocked", "in_review", "done", "cancelled"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const approval = await policyRepo.getApproval(id);
  if (!approval || approval.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (approval.status !== "pending") return NextResponse.json({ error: "Already resolved" }, { status: 400 });

  if (approval.approverRole) {
    try {
      await requireOrgRole(ctx.orgId, ctx.userId, approval.approverRole as OrgRole);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: `This approval requires a ${approval.approverRole} or higher. ${error.message}` }, { status: 403 });
      }
      throw error;
    }
  }

  const body = await request.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await policyRepo.resolveApproval(id, ctx.userId, parsed.data.decision);
  const queues = getQueues();

  if (approval.workflowRunId) {
    // A workflow `approval` node is suspended waiting on this — resume it with the decision.
    await queues.workflowResume.add("resume", {
      workflowRunId: approval.workflowRunId,
      resumePayload: { approved: parsed.data.decision === "approved", note: parsed.data.note },
    });
    return NextResponse.json({ ok: true });
  }

  // Everything past this point is a deferred agent action (see tool-set.ts's approval gate):
  // the agent's run already completed telling the user it was queued. Approving now actually
  // performs the real effect and starts a follow-up run for that agent with the outcome.
  const payload = approval.payload as { toolId?: string; taskId?: string; status?: string; input?: unknown; note?: string };
  let actionResult: unknown;
  let actionError: string | undefined;

  if (parsed.data.decision === "approved" && approval.actionType.startsWith("task.status.") && payload.taskId && payload.status) {
    const parsedStatus = TASK_STATUSES.find((s) => s === payload.status);
    if (parsedStatus) {
      const task = await transitionTask(ctx.orgId, payload.taskId, parsedStatus, { type: "human", id: ctx.userId }, undefined);
      actionResult = { taskId: task?.id, status: task?.status };
    } else {
      actionError = `Unknown task status "${payload.status}".`;
    }
  } else if (parsed.data.decision === "approved" && payload.toolId) {
    const tool = await toolsRepo.getToolById(ctx.orgId, payload.toolId);
    if (tool) {
      const result = await executeTool({ tool, orgId: ctx.orgId, agentId: approval.requestedById, input: payload.input });
      actionResult = result.status === "success" ? result.output : { error: result.errorMessage };
      actionError = result.status === "error" ? result.errorMessage : undefined;
    } else {
      actionError = `Tool ${payload.toolId} no longer exists.`;
    }
  }

  const followUpInput = {
    sourceKind: "approval_resolved" as const,
    approvalId: approval.id,
    actionType: approval.actionType,
    decision: parsed.data.decision,
    note: parsed.data.note,
    toolResult: actionResult,
    toolError: actionError,
  };
  const run = await runsRepo.createAgentRun({ agentId: approval.requestedById, input: followUpInput });
  await queues.agentRun.add("run", { runId: run.id, orgId: ctx.orgId, agentId: approval.requestedById, input: followUpInput });

  return NextResponse.json({ ok: true, followUpRunId: run.id });
}
