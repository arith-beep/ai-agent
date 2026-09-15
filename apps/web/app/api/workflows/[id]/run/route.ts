import { NextResponse } from "next/server";
import { workflowsRepo } from "@ai-agent/storage";
import { createWorkflowRunRecord } from "@ai-agent/workflow-engine";
import { getQueues } from "@ai-agent/queue";
import { getApiContext } from "@/lib/api-session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const workflow = await workflowsRepo.getWorkflow(id);
  if (!workflow || workflow.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const input = body.input ?? {};

  const { runId } = await createWorkflowRunRecord({
    workflowId: workflow.id,
    input,
    triggeredByType: "manual",
    triggeredById: ctx.userId,
  });

  const queues = getQueues();
  await queues.workflowRun.add("run", { runId, orgId: ctx.orgId, workflowId: workflow.id, input });

  return NextResponse.json({ runId }, { status: 202 });
}
