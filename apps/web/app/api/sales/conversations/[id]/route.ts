import { NextResponse } from "next/server";
import { salesRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const conversation = await salesRepo.getConversation(ctx.orgId, id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [agent, messages, lead] = await Promise.all([
    salesRepo.getAgentById(ctx.orgId, conversation.agentId),
    salesRepo.listMessages(id),
    conversation.leadId ? salesRepo.getLead(ctx.orgId, conversation.leadId) : Promise.resolve(null),
  ]);

  const qualificationHistory = lead ? await salesRepo.listQualificationHistory(lead.id) : [];
  const meetings = lead ? await salesRepo.listMeetingsForLead(lead.id) : [];

  return NextResponse.json({ conversation, agent, messages, lead, qualificationHistory, meetings });
}
