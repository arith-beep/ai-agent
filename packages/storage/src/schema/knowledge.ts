import { pgTable, uuid, text, timestamp, jsonb, pgEnum, integer, vector, index } from "drizzle-orm/pg-core";
import { organizations, users } from "./tenancy";

export const knowledgeSourceTypeEnum = pgEnum("knowledge_source_type", [
  "pdf",
  "docx",
  "txt",
  "url",
  "website",
  "csv",
  "database",
  "api",
]);

export const knowledgeDocumentStatusEnum = pgEnum("knowledge_document_status", [
  "pending",
  "parsing",
  "chunking",
  "embedding",
  "ready",
  "failed",
]);

/** OpenAI text-embedding-3-small dimensionality; see packages/rag for the embedder used. */
export const EMBEDDING_DIMENSIONS = 1536;

export const knowledgeBases = pgTable("knowledge_bases", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sourceType: knowledgeSourceTypeEnum("source_type").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  knowledgeBaseId: uuid("knowledge_base_id")
    .notNull()
    .references(() => knowledgeBases.id, { onDelete: "cascade" }),
  sourceUri: text("source_uri").notNull(),
  status: knowledgeDocumentStatusEnum("status").notNull().default("pending"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    chunkIndex: integer("chunk_index").notNull(),
  },
  (table) => [
    index("knowledge_chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);
