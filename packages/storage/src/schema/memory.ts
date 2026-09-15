import { pgTable, uuid, text, timestamp, jsonb, integer, vector, index } from "drizzle-orm/pg-core";
import { agents } from "./agents";
import { users } from "./tenancy";
import { EMBEDDING_DIMENSIONS } from "./knowledge";

export const memoryThreads = pgTable("memory_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  resourceId: text("resource_id"),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memoryMessages = pgTable("memory_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => memoryThreads.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "tool", "system"] }).notNull(),
  content: jsonb("content").$type<unknown>().notNull(),
  toolCalls: jsonb("tool_calls").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memoryWorking = pgTable("memory_working", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => memoryThreads.id, { onDelete: "cascade" }),
  resourceId: text("resource_id"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  schemaVersion: integer("schema_version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memoryMessageEmbeddings = pgTable(
  "memory_message_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => memoryMessages.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (table) => [
    index("memory_message_embeddings_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);
