import { messagingRepo, agentsRepo, auditRepo } from "@ai-agent/storage";
import { getQueues, priorityFor } from "@ai-agent/queue";
import { sendAgentMessageInputSchema, validateMessagePayload, type SendAgentMessageInput } from "@ai-agent/shared-types";

export class MessageAuthorizationError extends Error {}

export async function sendMessage(orgId: string, input: SendAgentMessageInput) {
  const validated = sendAgentMessageInputSchema.parse(input);
  validateMessagePayload(validated.kind, validated.payload);

  if (validated.from.type === "agent" && validated.to.type === "agent") {
    const connected = await agentsRepo.areAgentsConnected(validated.from.id, validated.to.id);
    if (!connected) {
      await auditRepo.writeAuditLog({
        orgId,
        actorType: "agent",
        actorId: validated.from.id,
        action: "message.rejected_unauthorized",
        targetType: "agent",
        targetId: validated.to.id,
        payload: { kind: validated.kind },
      });
      throw new MessageAuthorizationError(
        `Agent ${validated.from.id} is not connected to agent ${validated.to.id}; add an agent connection before they can message each other.`,
      );
    }
  }

  const conversationId = validated.conversationId ?? (await messagingRepo.findOrCreateConversation(orgId, validated.from, validated.to));

  const message = await messagingRepo.insertAgentMessage({
    conversationId,
    from: validated.from,
    to: validated.to,
    kind: validated.kind,
    payload: validated.payload,
    priority: validated.priority,
    correlationId: validated.correlationId,
  });

  await auditRepo.writeAuditLog({
    orgId,
    actorType: validated.from.type,
    actorId: validated.from.id,
    action: "message.sent",
    targetType: "agent_message",
    targetId: message.id,
    payload: { kind: validated.kind, to: validated.to },
  });

  const queues = getQueues();
  await queues.deliverAgentMessage.add("deliver", { messageId: message.id }, { priority: priorityFor(validated.priority) });

  return message;
}
