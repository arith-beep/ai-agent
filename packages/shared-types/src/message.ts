import { z } from "zod";

export const participantTypeSchema = z.enum(["human", "agent"]);
export type ParticipantType = z.infer<typeof participantTypeSchema>;

export const participantRefSchema = z.object({
  type: participantTypeSchema,
  id: z.string().uuid(),
});
export type ParticipantRef = z.infer<typeof participantRefSchema>;

export const messageKindSchema = z.enum(["task", "query", "notification", "event", "response"]);
export type MessageKind = z.infer<typeof messageKindSchema>;

export const messagePrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type MessagePriority = z.infer<typeof messagePrioritySchema>;

export const messageStatusSchema = z.enum(["pending", "delivered", "processing", "processed", "failed"]);
export type MessageStatus = z.infer<typeof messageStatusSchema>;

/** Per-kind payload shapes. Validated at send time based on `kind`. */
export const taskMessagePayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: messagePrioritySchema.default("normal"),
  dueDate: z.string().datetime().optional(),
});

export const queryMessagePayloadSchema = z.object({
  question: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const notificationMessagePayloadSchema = z.object({
  summary: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const eventMessagePayloadSchema = z.object({
  eventType: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const responseMessagePayloadSchema = z.object({
  result: z.unknown(),
  summary: z.string().optional(),
});

export const messagePayloadByKind = {
  task: taskMessagePayloadSchema,
  query: queryMessagePayloadSchema,
  notification: notificationMessagePayloadSchema,
  event: eventMessagePayloadSchema,
  response: responseMessagePayloadSchema,
} as const;

export const sendAgentMessageInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  from: participantRefSchema,
  to: participantRefSchema,
  kind: messageKindSchema,
  payload: z.record(z.string(), z.unknown()),
  priority: messagePrioritySchema.default("normal"),
  correlationId: z.string().uuid().optional(),
});
export type SendAgentMessageInput = z.infer<typeof sendAgentMessageInputSchema>;

export function validateMessagePayload(kind: MessageKind, payload: unknown) {
  return messagePayloadByKind[kind].parse(payload);
}
