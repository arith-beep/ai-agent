import { NextResponse } from "next/server";
import { messagingRepo, agentsRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await messagingRepo.listMessagesForRecipient("human", ctx.userId);
  const agentIds = [...new Set(messages.filter((m) => m.fromType === "agent").map((m) => m.fromId))];
  const agents = await Promise.all(agentIds.map((id) => agentsRepo.getAgentById(ctx.orgId, id)));
  const agentNameById = new Map(agents.filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => [a.id, a.name]));

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      fromName: m.fromType === "agent" ? (agentNameById.get(m.fromId) ?? "Unknown agent") : "You",
    })),
  });
}
