import { eq, and } from "drizzle-orm";
import type { ParticipantRef, MessageKind, MessagePriority } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function findOrCreateConversation(orgId: string, a: ParticipantRef, b: ParticipantRef) {
  const db = getDb();
  const type = a.type === "human" || b.type === "human" ? "human_agent" : "agent_agent";

  const existingA = await db
    .select({ conversationId: schema.conversationParticipants.conversationId })
    .from(schema.conversationParticipants)
    .where(and(eq(schema.conversationParticipants.participantType, a.type), eq(schema.conversationParticipants.participantId, a.id)));

  for (const row of existingA) {
    const hasB = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(schema.conversationParticipants.conversationId, row.conversationId),
        eq(schema.conversationParticipants.participantType, b.type),
        eq(schema.conversationParticipants.participantId, b.id),
      ),
    });
    if (hasB) return row.conversationId;
  }

  const [conversation] = await db.insert(schema.conversations).values({ orgId, type }).returning();
  if (!conversation) throw new Error("Failed to create conversation");
  await db.insert(schema.conversationParticipants).values([
    { conversationId: conversation.id, participantType: a.type, participantId: a.id },
    { conversationId: conversation.id, participantType: b.type, participantId: b.id },
  ]);
  return conversation.id;
}

export async function insertAgentMessage(input: {
  conversationId: string;
  from: ParticipantRef;
  to: ParticipantRef;
  kind: MessageKind;
  payload: Record<string, unknown>;
  priority: MessagePriority;
  correlationId?: string;
}) {
  const db = getDb();
  const [message] = await db
    .insert(schema.agentMessages)
    .values({
      conversationId: input.conversationId,
      fromType: input.from.type,
      fromId: input.from.id,
      toType: input.to.type,
      toId: input.to.id,
      kind: input.kind,
      payload: input.payload,
      priority: input.priority,
      correlationId: input.correlationId,
      status: "pending",
    })
    .returning();
  if (!message) throw new Error("Failed to insert agent message");
  return message;
}

export async function getConversation(conversationId: string) {
  const db = getDb();
  return db.query.conversations.findFirst({ where: eq(schema.conversations.id, conversationId) });
}

export async function getAgentMessage(messageId: string) {
  const db = getDb();
  return db.query.agentMessages.findFirst({ where: eq(schema.agentMessages.id, messageId) });
}

export async function setMessageStatus(
  messageId: string,
  status: (typeof schema.messageStatusEnum.enumValues)[number],
  errorMessage?: string,
) {
  const db = getDb();
  const [updated] = await db
    .update(schema.agentMessages)
    .set({
      status,
      errorMessage,
      processedAt: status === "processed" || status === "failed" ? new Date() : undefined,
    })
    .where(eq(schema.agentMessages.id, messageId))
    .returning();
  return updated;
}

export async function incrementRetryCount(messageId: string) {
  const db = getDb();
  const message = await getAgentMessage(messageId);
  if (!message) return undefined;
  const [updated] = await db
    .update(schema.agentMessages)
    .set({ retryCount: message.retryCount + 1 })
    .where(eq(schema.agentMessages.id, messageId))
    .returning();
  return updated;
}

export async function findResponseForCorrelation(correlationId: string) {
  const db = getDb();
  return db.query.agentMessages.findFirst({
    where: and(eq(schema.agentMessages.correlationId, correlationId), eq(schema.agentMessages.kind, "response")),
  });
}

export async function listMessagesForConversation(conversationId: string) {
  const db = getDb();
  return db.query.agentMessages.findMany({
    where: eq(schema.agentMessages.conversationId, conversationId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
}

export async function listMessagesForRecipient(toType: "human" | "agent", toId: string) {
  const db = getDb();
  return db.query.agentMessages.findMany({
    where: and(eq(schema.agentMessages.toType, toType), eq(schema.agentMessages.toId, toId)),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });
}

export async function insertAgentEvent(orgId: string, sourceAgentId: string, type: string, payload: Record<string, unknown>) {
  const db = getDb();
  const [event] = await db.insert(schema.agentEvents).values({ orgId, sourceAgentId, type, payload }).returning();
  return event;
}
