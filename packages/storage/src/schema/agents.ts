import { pgTable, uuid, text, timestamp, pgEnum, numeric, integer, boolean, jsonb, real, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations, users, departments } from "./tenancy";
import { tools } from "./tools";
import { knowledgeBases } from "./knowledge";
import { workflows } from "./workflows";

export const agentStatusEnum = pgEnum("agent_status", ["draft", "enabled", "disabled"]);
export const modelProviderEnum = pgEnum("model_provider", ["openai", "anthropic", "google", "openrouter"]);
export const agentConnectionTypeEnum = pgEnum("agent_connection_type", ["peer", "reports_to", "manages", "delegates_to"]);
export const kpiPeriodEnum = pgEnum("kpi_period", ["daily", "weekly", "monthly"]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
  description: text("description"),
  objective: text("objective"),
  systemPrompt: text("system_prompt").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  modelName: text("model_name").notNull(),
  temperature: real("temperature").notNull().default(0.7),
  maxTokens: integer("max_tokens").notNull().default(4096),
  fallbackModelProvider: modelProviderEnum("fallback_model_provider"),
  fallbackModelName: text("fallback_model_name"),
  status: agentStatusEnum("status").notNull().default("draft"),
  managerAgentId: uuid("manager_agent_id"),
  humanManagerId: uuid("human_manager_id").references(() => users.id, { onDelete: "set null" }),
  avatarUrl: text("avatar_url"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentConnections = pgTable(
  "agent_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    connectedAgentId: uuid("connected_agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    relationshipType: agentConnectionTypeEnum("relationship_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("agent_connections_unique_idx").on(table.agentId, table.connectedAgentId, table.relationshipType)],
);

export const agentTools = pgTable(
  "agent_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => [uniqueIndex("agent_tools_unique_idx").on(table.agentId, table.toolId)],
);

export const agentKnowledgeBases = pgTable(
  "agent_knowledge_bases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    knowledgeBaseId: uuid("knowledge_base_id")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("agent_kb_unique_idx").on(table.agentId, table.knowledgeBaseId)],
);

export const agentWorkflows = pgTable("agent_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  triggerMode: text("trigger_mode", { enum: ["manual", "autonomous"] }).notNull().default("manual"),
});

export const agentPermissions = pgTable("agent_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  actionPattern: text("action_pattern").notNull(),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approverRole: text("approver_role"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentKpis = pgTable("agent_kpis", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetValue: numeric("target_value"),
  currentValue: numeric("current_value"),
  unit: text("unit"),
  period: kpiPeriodEnum("period").notNull().default("weekly"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
