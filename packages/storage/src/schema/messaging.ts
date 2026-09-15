import { pgTable, uuid, text, timestamp, jsonb, pgEnum, integer } from "drizzle-orm/pg-core";
import { organizations } from "./tenancy";

export const participantTypeEnum = pgEnum("participant_type", ["human", "agent"]);
export const conversationTypeEnum = pgEnum("conversation_type", ["human_agent", "agent_agent"]);
export const messageKindEnum = pgEnum("message_kind", ["task", "query", "notification", "event", "response"]);
export const messagePriorityEnum = pgEnum("message_priority", ["low", "normal", "high", "urgent"]);
export const messageStatusEnum = pgEnum("message_status", ["pending", "delivered", "processing", "processed", "failed"]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: conversationTypeEnum("type").notNull(),
  subject: text("subject"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  participantType: participantTypeEnum("participant_type").notNull(),
  participantId: uuid("participant_id").notNull(),
});

export const agentMessages = pgTable("agent_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  fromType: participantTypeEnum("from_type").notNull(),
  fromId: uuid("from_id").notNull(),
  toType: participantTypeEnum("to_type").notNull(),
  toId: uuid("to_id").notNull(),
  kind: messageKindEnum("kind").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  priority: messagePriorityEnum("priority").notNull().default("normal"),
  correlationId: uuid("correlation_id"),
  status: messageStatusEnum("status").notNull().default("pending"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});

export const agentEvents = pgTable("agent_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  sourceAgentId: uuid("source_agent_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
