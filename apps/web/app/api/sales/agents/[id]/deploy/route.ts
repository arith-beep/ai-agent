import { NextResponse } from "next/server";
import { salesRepo } from "@ai-agent/storage";
import { buildSalesSystemPrompt } from "@ai-agent/sales-agent";
import { getApiContext } from "@/lib/api-session";

/** Snapshots the agent's current config + generated system prompt as a new version and marks it active. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!agent.playbook || !(agent.playbook as { primaryObjective?: string }).primaryObjective) {
    return NextResponse.json({ error: "Define a primary objective in the Sales Playbook before deploying." }, { status: 400 });
  }

  const generatedSystemPrompt = buildSalesSystemPrompt(agent);
  const version = await salesRepo.createAgentVersion({
    agentId: id,
    configSnapshot: {
      identity: { name: agent.name, companyName: agent.companyName, role: agent.role, description: agent.description, language: agent.language, tone: agent.tone, personality: agent.personality },
      playbook: agent.playbook,
      guardrails: agent.guardrails,
      modelProvider: agent.modelProvider,
      modelName: agent.modelName,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    },
    generatedSystemPrompt,
    createdBy: ctx.userId,
  });

  const updated = await salesRepo.updateAgent(ctx.orgId, id, { status: "active" });
  return NextResponse.json({ agent: updated, version });
}
