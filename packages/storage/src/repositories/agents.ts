import { eq, and } from "drizzle-orm";
import type { CreateAgentInput, UpdateAgentInput } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function createAgent(orgId: string, createdBy: string, input: CreateAgentInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [agent] = await tx
      .insert(schema.agents)
      .values({
        orgId,
        name: input.name,
        role: input.role,
        departmentId: input.departmentId,
        description: input.description,
        objective: input.objective,
        systemPrompt: input.systemPrompt,
        modelProvider: input.model.provider,
        modelName: input.model.model,
        temperature: input.model.temperature,
        maxTokens: input.model.maxTokens,
        fallbackModelProvider: input.fallbackModel?.provider,
        fallbackModelName: input.fallbackModel?.model,
        managerAgentId: input.managerAgentId,
        humanManagerId: input.humanManagerId,
        status: "draft",
        createdBy,
      })
      .returning();
    if (!agent) throw new Error("Failed to create agent");

    if (input.toolIds.length > 0) {
      await tx.insert(schema.agentTools).values(input.toolIds.map((toolId) => ({ agentId: agent.id, toolId })));
    }
    if (input.knowledgeBaseIds.length > 0) {
      await tx
        .insert(schema.agentKnowledgeBases)
        .values(input.knowledgeBaseIds.map((knowledgeBaseId) => ({ agentId: agent.id, knowledgeBaseId })));
    }
    if (input.permissions.length > 0) {
      await tx.insert(schema.agentPermissions).values(
        input.permissions.map((p) => ({
          agentId: agent.id,
          actionPattern: p.actionPattern,
          requiresApproval: p.requiresApproval,
          approverRole: p.approverRole,
        })),
      );
    }
    return agent;
  });
}

export async function updateAgent(orgId: string, agentId: string, input: UpdateAgentInput) {
  const db = getDb();
  const patch: Partial<typeof schema.agents.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.role !== undefined) patch.role = input.role;
  if (input.departmentId !== undefined) patch.departmentId = input.departmentId;
  if (input.description !== undefined) patch.description = input.description;
  if (input.objective !== undefined) patch.objective = input.objective;
  if (input.systemPrompt !== undefined) patch.systemPrompt = input.systemPrompt;
  if (input.model) {
    patch.modelProvider = input.model.provider;
    patch.modelName = input.model.model;
    patch.temperature = input.model.temperature;
    patch.maxTokens = input.model.maxTokens;
  }
  if (input.fallbackModel) {
    patch.fallbackModelProvider = input.fallbackModel.provider;
    patch.fallbackModelName = input.fallbackModel.model;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.managerAgentId !== undefined) patch.managerAgentId = input.managerAgentId;
  if (input.humanManagerId !== undefined) patch.humanManagerId = input.humanManagerId;

  const [updated] = await db
    .update(schema.agents)
    .set(patch)
    .where(and(eq(schema.agents.id, agentId), eq(schema.agents.orgId, orgId)))
    .returning();

  if (input.toolIds) {
    await db.delete(schema.agentTools).where(eq(schema.agentTools.agentId, agentId));
    if (input.toolIds.length > 0) {
      await db.insert(schema.agentTools).values(input.toolIds.map((toolId) => ({ agentId, toolId })));
    }
  }
  if (input.knowledgeBaseIds) {
    await db.delete(schema.agentKnowledgeBases).where(eq(schema.agentKnowledgeBases.agentId, agentId));
    if (input.knowledgeBaseIds.length > 0) {
      await db
        .insert(schema.agentKnowledgeBases)
        .values(input.knowledgeBaseIds.map((knowledgeBaseId) => ({ agentId, knowledgeBaseId })));
    }
  }
  return updated;
}

export async function deleteAgent(orgId: string, agentId: string) {
  const db = getDb();
  await db.delete(schema.agents).where(and(eq(schema.agents.id, agentId), eq(schema.agents.orgId, orgId)));
}

export async function setAgentStatus(orgId: string, agentId: string, status: "draft" | "enabled" | "disabled") {
  const db = getDb();
  const [updated] = await db
    .update(schema.agents)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(schema.agents.id, agentId), eq(schema.agents.orgId, orgId)))
    .returning();
  return updated;
}

export async function listAgents(orgId: string) {
  const db = getDb();
  return db.query.agents.findMany({ where: eq(schema.agents.orgId, orgId), orderBy: (a, { desc }) => [desc(a.createdAt)] });
}

export async function getAgentById(orgId: string, agentId: string) {
  const db = getDb();
  return db.query.agents.findFirst({ where: and(eq(schema.agents.id, agentId), eq(schema.agents.orgId, orgId)) });
}

/** Full runtime config for the Agent Runtime: agent row + tools + knowledge bases + permissions. */
export async function getAgentRuntimeConfig(orgId: string, agentId: string) {
  const db = getDb();
  const agent = await getAgentById(orgId, agentId);
  if (!agent) return undefined;

  const [toolLinks, kbLinks, permissions] = await Promise.all([
    db
      .select({ tool: schema.tools, config: schema.agentTools.config, enabled: schema.agentTools.enabled })
      .from(schema.agentTools)
      .innerJoin(schema.tools, eq(schema.tools.id, schema.agentTools.toolId))
      .where(and(eq(schema.agentTools.agentId, agentId), eq(schema.agentTools.enabled, true))),
    db
      .select({ knowledgeBase: schema.knowledgeBases })
      .from(schema.agentKnowledgeBases)
      .innerJoin(schema.knowledgeBases, eq(schema.knowledgeBases.id, schema.agentKnowledgeBases.knowledgeBaseId))
      .where(eq(schema.agentKnowledgeBases.agentId, agentId)),
    db.query.agentPermissions.findMany({ where: eq(schema.agentPermissions.agentId, agentId) }),
  ]);

  return {
    agent,
    tools: toolLinks.map((t) => ({ ...t.tool, config: t.config ?? {} })),
    knowledgeBases: kbLinks.map((k) => k.knowledgeBase),
    permissions,
  };
}

export async function cloneAgent(orgId: string, agentId: string, createdBy: string, newName: string) {
  const db = getDb();
  const config = await getAgentRuntimeConfig(orgId, agentId);
  if (!config) throw new Error("Agent not found");
  const { agent, tools, knowledgeBases, permissions } = config;
  return createAgent(orgId, createdBy, {
    name: newName,
    role: agent.role,
    departmentId: agent.departmentId ?? undefined,
    description: agent.description ?? undefined,
    objective: agent.objective ?? undefined,
    systemPrompt: agent.systemPrompt,
    model: {
      provider: agent.modelProvider,
      model: agent.modelName,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    },
    fallbackModel:
      agent.fallbackModelProvider && agent.fallbackModelName
        ? { provider: agent.fallbackModelProvider, model: agent.fallbackModelName, temperature: agent.temperature, maxTokens: agent.maxTokens }
        : undefined,
    managerAgentId: agent.managerAgentId ?? undefined,
    humanManagerId: agent.humanManagerId ?? undefined,
    toolIds: tools.map((t) => t.id),
    knowledgeBaseIds: knowledgeBases.map((k) => k.id),
    permissions: permissions.map((p) => ({
      actionPattern: p.actionPattern,
      requiresApproval: p.requiresApproval,
      approverRole: p.approverRole ?? undefined,
    })),
  });
}

export async function connectAgents(
  agentId: string,
  connectedAgentId: string,
  relationshipType: "peer" | "reports_to" | "manages" | "delegates_to",
) {
  const db = getDb();
  await db.insert(schema.agentConnections).values({ agentId, connectedAgentId, relationshipType }).onConflictDoNothing();
}

export async function listConnections(agentId: string) {
  const db = getDb();
  return db
    .select({ connectedAgent: schema.agents, relationshipType: schema.agentConnections.relationshipType })
    .from(schema.agentConnections)
    .innerJoin(schema.agents, eq(schema.agents.id, schema.agentConnections.connectedAgentId))
    .where(eq(schema.agentConnections.agentId, agentId));
}

export async function areAgentsConnected(agentId: string, otherAgentId: string) {
  const db = getDb();
  const link = await db.query.agentConnections.findFirst({
    where: and(eq(schema.agentConnections.agentId, agentId), eq(schema.agentConnections.connectedAgentId, otherAgentId)),
  });
  return Boolean(link);
}
