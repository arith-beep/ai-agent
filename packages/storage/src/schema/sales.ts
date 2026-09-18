import { pgTable, uuid, text, timestamp, jsonb, pgEnum, integer, real, boolean, vector, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations, users } from "./tenancy";
import { modelProviderEnum } from "./agents";
import { tools } from "./tools";

/**
 * Sales Agent Builder domain — a distinct product from the internal
 * multi-agent workforce platform (see docs/architecture). Deliberately uses
 * its own tables rather than reusing `agents`/`knowledge_bases`/etc.: those
 * are shaped for internal automation agents (department, manager hierarchy,
 * one-sourceType-per-KB) and this domain's config/knowledge/conversation
 * shapes are different enough that sharing tables would mean compromising
 * one product to fit the other. Model routing (`resolveModel`), embeddings
 * (`embedTexts`), tool execution/logging (`tools`/`tool_executions`), and
 * chunking/extraction utilities are still fully shared — see
 * packages/sales-agent.
 */

export const salesAgentStatusEnum = pgEnum("sales_agent_status", ["draft", "active", "paused", "archived"]);

export const salesKnowledgeSourceTypeEnum = pgEnum("sales_knowledge_source_type", ["text", "url", "pdf"]);
export const salesKnowledgeSourceStatusEnum = pgEnum("sales_knowledge_source_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const salesConversationStatusEnum = pgEnum("sales_conversation_status", ["active", "handoff", "closed"]);
export const salesMessageRoleEnum = pgEnum("sales_message_role", ["user", "assistant", "system", "tool"]);

export const salesLeadStatusEnum = pgEnum("sales_lead_status", [
  "new",
  "engaged",
  "qualified",
  "unqualified",
  "meeting_requested",
  "meeting_booked",
  "human_handoff",
]);

export const salesMeetingStatusEnum = pgEnum("sales_meeting_status", ["requested", "confirmed", "cancelled"]);
export const salesHandoffStatusEnum = pgEnum("sales_handoff_status", ["pending", "acknowledged", "resolved"]);
export const salesMaxAutonomyEnum = pgEnum("sales_max_autonomy", ["suggest_only", "act_with_confirmation", "full_autonomy"]);

/** 1536-dim (OpenAI text-embedding-3-small), matching packages/model-providers's embedder. */
export const SALES_EMBEDDING_DIMENSIONS = 1536;

export const salesAgents = pgTable("sales_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // Identity
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  role: text("role").notNull(),
  description: text("description"),
  language: text("language").notNull().default("en"),
  tone: text("tone").notNull().default("professional"),
  personality: jsonb("personality").$type<string[]>().notNull().default([]),

  // Sales playbook — structured, not one giant text field (see shared-types).
  playbook: jsonb("playbook").$type<Record<string, unknown>>().notNull().default({}),

  // Guardrails
  guardrails: jsonb("guardrails").$type<Record<string, unknown>>().notNull().default({}),

  // Model
  modelProvider: modelProviderEnum("model_provider").notNull().default("openai"),
  modelName: text("model_name").notNull().default("gpt-4o-mini"),
  temperature: real("temperature").notNull().default(0.5),
  maxTokens: integer("max_tokens").notNull().default(2048),

  status: salesAgentStatusEnum("status").notNull().default("draft"),
  avatarUrl: text("avatar_url"),

  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only snapshot written each time an agent is deployed — audit trail + rollback, not the runtime's source of truth (that's always the live `sales_agents` row). */
export const salesAgentVersions = pgTable("sales_agent_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => salesAgents.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  configSnapshot: jsonb("config_snapshot").$type<Record<string, unknown>>().notNull(),
  generatedSystemPrompt: text("generated_system_prompt").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesAgentTools = pgTable(
  "sales_agent_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => salesAgents.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [uniqueIndex("sales_agent_tools_unique_idx").on(table.agentId, table.toolId)],
);

export const salesKnowledgeSources = pgTable("sales_knowledge_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => salesAgents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: salesKnowledgeSourceTypeEnum("type").notNull(),
  /** Pasted text: the content itself. url/pdf: the source URL. */
  sourceUri: text("source_uri").notNull(),
  status: salesKnowledgeSourceStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesKnowledgeChunks = pgTable(
  "sales_knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => salesKnowledgeSources.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: SALES_EMBEDDING_DIMENSIONS }),
    chunkIndex: integer("chunk_index").notNull(),
  },
  (table) => [
    index("sales_knowledge_chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const salesLeads = pgTable("sales_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").references(() => salesAgents.id, { onDelete: "set null" }),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  interest: text("interest"),
  budget: text("budget"),
  timeline: text("timeline"),
  status: salesLeadStatusEnum("status").notNull().default("new"),
  statusReason: text("status_reason"),
  notes: text("notes"),
  source: text("source").notNull().default("agent_conversation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesConversations = pgTable("sales_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => salesAgents.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").references(() => salesLeads.id, { onDelete: "set null" }),
  channel: text("channel", { enum: ["playground", "web"] }).notNull().default("playground"),
  status: salesConversationStatusEnum("status").notNull().default("active"),
  isTest: boolean("is_test").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesMessages = pgTable("sales_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => salesConversations.id, { onDelete: "cascade" }),
  role: salesMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  /** Debug trace for this turn: retrieved knowledge, tool calls, latency, errors — surfaced in the Playground and Conversation detail. */
  debug: jsonb("debug").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** History of qualification-state transitions for a lead, each with the criteria evaluated and why it changed. */
export const salesLeadQualifications = pgTable("sales_lead_qualifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => salesLeads.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => salesConversations.id, { onDelete: "set null" }),
  status: salesLeadStatusEnum("status").notNull(),
  criteria: jsonb("criteria").$type<Record<string, unknown>>().notNull().default({}),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesMeetings = pgTable("sales_meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => salesLeads.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => salesConversations.id, { onDelete: "set null" }),
  agentId: uuid("agent_id").references(() => salesAgents.id, { onDelete: "set null" }),
  proposedTime: timestamp("proposed_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes").default(30),
  status: salesMeetingStatusEnum("status").notNull().default("requested"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesHandoffs = pgTable("sales_handoffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => salesConversations.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id").references(() => salesLeads.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  status: salesHandoffStatusEnum("status").notNull().default("pending"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
