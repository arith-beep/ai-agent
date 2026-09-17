import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import type { ChatMessage, TurnDebug } from "../../agents/[id]/_hooks/use-agent-chat";
import { ConversationDetail } from "./_components/conversation-detail";

function toChatMessage(m: { id: string; role: string; content: string; debug: Record<string, unknown> | null }): ChatMessage {
  const debug = m.debug as Partial<TurnDebug> | null;
  return {
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
    debug: debug
      ? {
          retrievedChunks: debug.retrievedChunks ?? [],
          toolCalls: debug.toolCalls ?? [],
          latencyMs: debug.latencyMs ?? 0,
          model: debug.model ?? "",
          error: debug.error,
          lead: debug.lead ?? null,
        }
      : undefined,
  };
}

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const conversation = await salesRepo.getConversation(ctx.orgId, id);
  if (!conversation) notFound();

  const [agent, rawMessages, lead, handoff] = await Promise.all([
    salesRepo.getAgentById(ctx.orgId, conversation.agentId),
    salesRepo.listMessages(id),
    conversation.leadId ? salesRepo.getLead(ctx.orgId, conversation.leadId) : Promise.resolve(null),
    conversation.status === "handoff" ? salesRepo.getHandoffForConversation(ctx.orgId, id) : Promise.resolve(null),
  ]);

  const meetings = lead ? await salesRepo.listMeetingsForLead(lead.id) : [];
  const activeMeeting = meetings.find((m) => m.status !== "cancelled") ?? null;
  const messages = rawMessages.filter((m) => m.role !== "system").map(toChatMessage);

  return (
    <ConversationDetail
      conversationStatus={conversation.status}
      channel={conversation.channel}
      leadDisplayName={lead?.name ?? lead?.email ?? "Anonymous visitor"}
      agentId={agent?.id ?? null}
      agentName={agent?.name ?? null}
      messages={messages}
      lead={
        lead
          ? {
              id: lead.id,
              name: lead.name,
              email: lead.email,
              status: lead.status,
              statusReason: lead.statusReason,
              company: lead.company,
              budget: lead.budget,
              timeline: lead.timeline,
              interest: lead.interest,
            }
          : null
      }
      meeting={
        activeMeeting
          ? {
              id: activeMeeting.id,
              status: activeMeeting.status,
              proposedTime: activeMeeting.proposedTime ? activeMeeting.proposedTime.toISOString() : null,
              durationMinutes: activeMeeting.durationMinutes,
            }
          : null
      }
      handoffId={handoff?.id ?? null}
      showResolveHandoff={conversation.status === "handoff" && !!handoff && handoff.status !== "resolved"}
    />
  );
}
