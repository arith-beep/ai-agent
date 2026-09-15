import { messagingRepo, agentsRepo, runsRepo } from "@ai-agent/storage";
import { getQueues } from "@ai-agent/queue";
import { createTask } from "@ai-agent/tasks";
import type { TaskMessagePayload, ResponseMessagePayload } from "./payload-types";

export async function deliverMessage(messageId: string): Promise<void> {
  const message = await messagingRepo.getAgentMessage(messageId);
  if (!message) throw new Error(`Agent message ${messageId} not found`);

  const conversation = await messagingRepo.getConversation(message.conversationId);
  if (!conversation) throw new Error(`Conversation ${message.conversationId} not found`);
  const orgId = conversation.orgId;

  await messagingRepo.setMessageStatus(messageId, "delivered");

  try {
    if (message.toType === "human") {
      // Humans read agent_messages directly (toType='human', toId=userId) as their notification feed —
      // no separate notifications table needed for MVP.
      await messagingRepo.setMessageStatus(messageId, "processed");
      return;
    }

    await messagingRepo.setMessageStatus(messageId, "processing");
    const queues = getQueues();

    if (message.kind === "task") {
      const payload = message.payload as unknown as TaskMessagePayload;
      await createTask({
        orgId,
        title: payload.title,
        description: payload.description,
        ownerType: "agent",
        ownerId: message.toId,
        createdByType: message.fromType,
        createdById: message.fromId,
        priority: payload.priority ?? "normal",
        dueDate: payload.dueDate,
        dependsOnTaskIds: [],
      });
    }

    // Every non-human-recipient message (task/query/event/notification/response) triggers a
    // run for the recipient agent so it actually acts on it, per docs/architecture/05. The
    // agent_runs row is created here (not inside the job handler) so its id is stable and
    // discoverable before the job is picked up, matching the Playground run contract.
    const runInput = {
      sourceKind: "agent_message" as const,
      messageId: message.id,
      from: { type: message.fromType, id: message.fromId },
      kind: message.kind,
      payload: message.payload,
      correlationId: message.correlationId ?? undefined,
    };
    const run = await runsRepo.createAgentRun({ agentId: message.toId, input: runInput });
    await queues.agentRun.add("run", { runId: run.id, orgId, agentId: message.toId, input: runInput });

    await messagingRepo.setMessageStatus(messageId, "processed");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await messagingRepo.setMessageStatus(messageId, "failed", errorMessage);
    throw error;
  }
}

/** Called once a message's delivery job has exhausted its BullMQ retry budget. */
export async function escalateFailedDelivery(messageId: string): Promise<void> {
  const message = await messagingRepo.getAgentMessage(messageId);
  if (!message) return;

  const conversation = await messagingRepo.getConversation(message.conversationId);
  if (!conversation) return;

  if (message.fromType !== "agent") return;
  const senderAgent = await agentsRepo.getAgentById(conversation.orgId, message.fromId);
  if (!senderAgent?.humanManagerId) return;

  const escalationConversationId = await messagingRepo.findOrCreateConversation(
    conversation.orgId,
    { type: "agent", id: senderAgent.id },
    { type: "human", id: senderAgent.humanManagerId },
  );
  await messagingRepo.insertAgentMessage({
    conversationId: escalationConversationId,
    from: { type: "agent", id: senderAgent.id },
    to: { type: "human", id: senderAgent.humanManagerId },
    kind: "notification",
    payload: {
      summary: `Message delivery failed after retries: ${message.errorMessage ?? "unknown error"}`,
      details: { originalMessageId: message.id, kind: message.kind, to: { type: message.toType, id: message.toId } },
    },
    priority: "high",
  });
}

export type { TaskMessagePayload, ResponseMessagePayload };
