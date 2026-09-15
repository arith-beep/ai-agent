import { NextResponse } from "next/server";
import { z } from "zod";
import { agentsRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

const connectSchema = z.object({
  connectedAgentId: z.string().uuid(),
  relationshipType: z.enum(["peer", "reports_to", "manages", "delegates_to"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: agentId } = await params;

  const body = await request.json();
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [source, target] = await Promise.all([
    agentsRepo.getAgentById(ctx.orgId, agentId),
    agentsRepo.getAgentById(ctx.orgId, parsed.data.connectedAgentId),
  ]);
  if (!source || !target) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  await agentsRepo.connectAgents(agentId, parsed.data.connectedAgentId, parsed.data.relationshipType);
  // Connections are bidirectional for messaging authorization purposes.
  await agentsRepo.connectAgents(parsed.data.connectedAgentId, agentId, parsed.data.relationshipType);

  return NextResponse.json({ ok: true });
}
