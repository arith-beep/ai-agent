import { NextResponse } from "next/server";
import { z } from "zod";
import { policyRepo, toolsRepo, runsRepo } from "@ai-agent/storage";
import { executeTool } from "@ai-agent/tools";
import { getQueues } from "@ai-agent/queue";
import { getApiContext } from "@/lib/api-session";

const resolveSchema = z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const approval = await policyRepo.getApproval(id);
  if (!approval || approval.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (approval.status !== "pending") return NextResponse.json({ error: "Already resolved" }, { status: 400 });

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

  // Otherwise this was a deferred agent tool call (see tool-set.ts's approval gate): the agent's
  // run already completed telling the user it was queued. Approving now actually runs the tool
  // for real and starts a fresh run for that agent so it can act on the result.
  const payload = approval.payload as { toolId?: string; input?: unknown };
  let toolResult: unknown;
  let toolError: string | undefined;

  if (parsed.data.decision === "approved" && payload.toolId) {
    const tool = await toolsRepo.getToolById(ctx.orgId, payload.toolId);
    if (tool) {
      const result = await executeTool({ tool, orgId: ctx.orgId, agentId: approval.requestedById, input: payload.input });
      toolResult = result.status === "success" ? result.output : { error: result.errorMessage };
      toolError = result.status === "error" ? result.errorMessage : undefined;
    } else {
      toolError = `Tool ${payload.toolId} no longer exists.`;
    }
  }

  const followUpInput = {
    sourceKind: "approval_resolved" as const,
    approvalId: approval.id,
    actionType: approval.actionType,
    decision: parsed.data.decision,
    note: parsed.data.note,
    toolResult,
    toolError,
  };
  const run = await runsRepo.createAgentRun({ agentId: approval.requestedById, input: followUpInput });
  await queues.agentRun.add("run", { runId: run.id, orgId: ctx.orgId, agentId: approval.requestedById, input: followUpInput });

  return NextResponse.json({ ok: true, followUpRunId: run.id });
}
