import { NextResponse } from "next/server";
import { z } from "zod";
import { agentsRepo, runsRepo } from "@ai-agent/storage";
import { getQueues } from "@ai-agent/queue";
import { getApiContext } from "@/lib/api-session";

const runInputSchema = z.object({
  message: z.string().min(1),
  threadId: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: agentId } = await params;

  const body = await request.json();
  const parsed = runInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const agent = await agentsRepo.getAgentById(ctx.orgId, agentId);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  if (agent.status !== "enabled") {
    return NextResponse.json({ error: `Agent "${agent.name}" is not enabled.` }, { status: 400 });
  }

  const run = await runsRepo.createAgentRun({ agentId, threadId: parsed.data.threadId, input: parsed.data.message });

  const queues = getQueues();
  await queues.agentRun.add("run", {
    runId: run.id,
    orgId: ctx.orgId,
    agentId,
    input: parsed.data.message,
    threadId: parsed.data.threadId,
  });

  return NextResponse.json({ runId: run.id }, { status: 202 });
}
