import { eq, and, desc, inArray, sql, count, gte } from "drizzle-orm";
import { getDb, schema } from "../db";

type SalesAgentPatch = Partial<typeof schema.salesAgents.$inferInsert>;

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export async function createAgent(
  orgId: string,
  createdBy: string,
  input: Omit<typeof schema.salesAgents.$inferInsert, "orgId" | "createdBy" | "id">,
) {
  const db = getDb();
  const [agent] = await db
    .insert(schema.salesAgents)
    .values({ ...input, orgId, createdBy })
    .returning();
  return agent;
}

export async function updateAgent(orgId: string, agentId: string, patch: SalesAgentPatch) {
  const db = getDb();
  const [agent] = await db
    .update(schema.salesAgents)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.salesAgents.id, agentId), eq(schema.salesAgents.orgId, orgId)))
    .returning();
  return agent;
}

export async function getAgentById(orgId: string, agentId: string) {
  const db = getDb();
  return db.query.salesAgents.findFirst({ where: and(eq(schema.salesAgents.id, agentId), eq(schema.salesAgents.orgId, orgId)) });
}

export async function listAgents(orgId: string) {
  const db = getDb();
  return db.query.salesAgents.findMany({ where: eq(schema.salesAgents.orgId, orgId), orderBy: (a, { desc }) => [desc(a.createdAt)] });
}

export async function countActiveAgents(orgId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(schema.salesAgents)
    .where(and(eq(schema.salesAgents.orgId, orgId), eq(schema.salesAgents.status, "active")));
  return row?.n ?? 0;
}

export async function createAgentVersion(input: {
  agentId: string;
  configSnapshot: Record<string, unknown>;
  generatedSystemPrompt: string;
  createdBy: string;
}) {
  const db = getDb();
  const maxVersionRows = await db
    .select({ maxVersion: sql<number>`coalesce(max(${schema.salesAgentVersions.versionNumber}), 0)` })
    .from(schema.salesAgentVersions)
    .where(eq(schema.salesAgentVersions.agentId, input.agentId));
  const maxVersion = maxVersionRows[0]?.maxVersion ?? 0;

  const [version] = await db
    .insert(schema.salesAgentVersions)
    .values({
      agentId: input.agentId,
      versionNumber: Number(maxVersion) + 1,
      configSnapshot: input.configSnapshot,
      generatedSystemPrompt: input.generatedSystemPrompt,
      createdBy: input.createdBy,
    })
    .returning();
  return version;
}

export async function listAgentVersions(agentId: string) {
  const db = getDb();
  return db.query.salesAgentVersions.findMany({
    where: eq(schema.salesAgentVersions.agentId, agentId),
    orderBy: (v, { desc }) => [desc(v.versionNumber)],
  });
}

// ---------------------------------------------------------------------------
// Agent <-> Tools
// ---------------------------------------------------------------------------

export async function attachTool(agentId: string, toolId: string, config?: Record<string, unknown>) {
  const db = getDb();
  const [row] = await db
    .insert(schema.salesAgentTools)
    .values({ agentId, toolId, config: config ?? {} })
    .onConflictDoUpdate({
      target: [schema.salesAgentTools.agentId, schema.salesAgentTools.toolId],
      set: { enabled: true, config: config ?? {} },
    })
    .returning();
  return row;
}

export async function setAgentToolEnabled(agentId: string, toolId: string, enabled: boolean) {
  const db = getDb();
  await db
    .update(schema.salesAgentTools)
    .set({ enabled })
    .where(and(eq(schema.salesAgentTools.agentId, agentId), eq(schema.salesAgentTools.toolId, toolId)));
}

export async function detachTool(agentId: string, toolId: string) {
  const db = getDb();
  await db.delete(schema.salesAgentTools).where(and(eq(schema.salesAgentTools.agentId, agentId), eq(schema.salesAgentTools.toolId, toolId)));
}

export async function listAgentTools(agentId: string) {
  const db = getDb();
  return db
    .select({ tool: schema.tools, enabled: schema.salesAgentTools.enabled, config: schema.salesAgentTools.config })
    .from(schema.salesAgentTools)
    .innerJoin(schema.tools, eq(schema.tools.id, schema.salesAgentTools.toolId))
    .where(eq(schema.salesAgentTools.agentId, agentId));
}

/** Only the enabled, attached tool rows — what the runtime actually exposes to the model. */
export async function listEnabledAgentTools(agentId: string) {
  const rows = await listAgentTools(agentId);
  return rows.filter((r) => r.enabled).map((r) => r.tool);
}

/** How many of the org's sales agents have each tool attached and enabled — the Integrations page's "used by N agent(s)" count. */
export async function countAgentsPerTool(orgId: string) {
  const db = getDb();
  return db
    .select({ toolId: schema.salesAgentTools.toolId, agentCount: count(schema.salesAgentTools.agentId) })
    .from(schema.salesAgentTools)
    .innerJoin(schema.salesAgents, eq(schema.salesAgents.id, schema.salesAgentTools.agentId))
    .where(and(eq(schema.salesAgents.orgId, orgId), eq(schema.salesAgentTools.enabled, true)))
    .groupBy(schema.salesAgentTools.toolId);
}

// ---------------------------------------------------------------------------
// Knowledge
// ---------------------------------------------------------------------------

export async function createKnowledgeSource(input: {
  orgId: string;
  agentId: string;
  createdBy: string;
  name: string;
  type: (typeof schema.salesKnowledgeSourceTypeEnum.enumValues)[number];
  sourceUri: string;
}) {
  const db = getDb();
  const [source] = await db.insert(schema.salesKnowledgeSources).values(input).returning();
  return source;
}

export async function getKnowledgeSource(sourceId: string) {
  const db = getDb();
  return db.query.salesKnowledgeSources.findFirst({ where: eq(schema.salesKnowledgeSources.id, sourceId) });
}

export async function listKnowledgeSourcesForAgent(agentId: string) {
  const db = getDb();
  return db.query.salesKnowledgeSources.findMany({
    where: eq(schema.salesKnowledgeSources.agentId, agentId),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });
}

export async function updateSourceStatus(
  sourceId: string,
  status: (typeof schema.salesKnowledgeSourceStatusEnum.enumValues)[number],
  errorMessage?: string,
) {
  const db = getDb();
  await db.update(schema.salesKnowledgeSources).set({ status, errorMessage }).where(eq(schema.salesKnowledgeSources.id, sourceId));
}

/** Every knowledge source across every agent in the org, newest first — the org-wide Knowledge overview page's aggregate table. */
export async function listAllKnowledgeSourcesForOrg(orgId: string) {
  const db = getDb();
  return db
    .select({
      source: schema.salesKnowledgeSources,
      agentId: schema.salesAgents.id,
      agentName: schema.salesAgents.name,
    })
    .from(schema.salesKnowledgeSources)
    .innerJoin(schema.salesAgents, eq(schema.salesAgents.id, schema.salesKnowledgeSources.agentId))
    .where(eq(schema.salesKnowledgeSources.orgId, orgId))
    .orderBy(desc(schema.salesKnowledgeSources.createdAt));
}

export async function deleteKnowledgeSource(orgId: string, sourceId: string) {
  const db = getDb();
  await db
    .delete(schema.salesKnowledgeSources)
    .where(and(eq(schema.salesKnowledgeSources.id, sourceId), eq(schema.salesKnowledgeSources.orgId, orgId)));
}

export async function insertKnowledgeChunks(
  sourceId: string,
  chunks: Array<{ content: string; embedding: number[]; chunkIndex: number }>,
) {
  const db = getDb();
  if (chunks.length === 0) return [];
  return db
    .insert(schema.salesKnowledgeChunks)
    .values(chunks.map((c) => ({ sourceId, content: c.content, embedding: c.embedding, chunkIndex: c.chunkIndex })))
    .returning();
}

/** Cosine-similarity search scoped to a single agent's knowledge sources. */
export async function searchAgentKnowledge(agentId: string, queryEmbedding: number[], topK = 5) {
  const db = getDb();
  const sourceRows = await db
    .select({ id: schema.salesKnowledgeSources.id })
    .from(schema.salesKnowledgeSources)
    .where(and(eq(schema.salesKnowledgeSources.agentId, agentId), eq(schema.salesKnowledgeSources.status, "ready")));
  const sourceIds = sourceRows.map((r) => r.id);
  if (sourceIds.length === 0) return [];

  const vectorLiteral = `[${queryEmbedding.join(",")}]`;
  const rows = await db
    .select({
      id: schema.salesKnowledgeChunks.id,
      content: schema.salesKnowledgeChunks.content,
      sourceId: schema.salesKnowledgeChunks.sourceId,
      distance: sql<number>`${schema.salesKnowledgeChunks.embedding} <=> ${vectorLiteral}::vector`,
    })
    .from(schema.salesKnowledgeChunks)
    .where(inArray(schema.salesKnowledgeChunks.sourceId, sourceIds))
    .orderBy(sql`${schema.salesKnowledgeChunks.embedding} <=> ${vectorLiteral}::vector`)
    .limit(topK);

  return rows.map((r) => ({ ...r, score: 1 - r.distance }));
}

// ---------------------------------------------------------------------------
// Conversations & messages
// ---------------------------------------------------------------------------

export async function createConversation(input: {
  orgId: string;
  agentId: string;
  channel?: "playground" | "web";
  isTest?: boolean;
}) {
  const db = getDb();
  const [conversation] = await db
    .insert(schema.salesConversations)
    .values({ orgId: input.orgId, agentId: input.agentId, channel: input.channel ?? "playground", isTest: input.isTest ?? false })
    .returning();
  return conversation;
}

export async function getConversation(orgId: string, conversationId: string) {
  const db = getDb();
  return db.query.salesConversations.findFirst({
    where: and(eq(schema.salesConversations.id, conversationId), eq(schema.salesConversations.orgId, orgId)),
  });
}

export async function listConversations(orgId: string, filters: { agentId?: string; status?: string; excludeTest?: boolean } = {}) {
  const db = getDb();
  const conditions = [eq(schema.salesConversations.orgId, orgId)];
  if (filters.agentId) conditions.push(eq(schema.salesConversations.agentId, filters.agentId));
  if (filters.status) conditions.push(eq(schema.salesConversations.status, filters.status as never));
  if (filters.excludeTest) conditions.push(eq(schema.salesConversations.isTest, false));

  return db
    .select({
      conversation: schema.salesConversations,
      agentName: schema.salesAgents.name,
      leadName: schema.salesLeads.name,
      leadEmail: schema.salesLeads.email,
      leadStatus: schema.salesLeads.status,
    })
    .from(schema.salesConversations)
    .innerJoin(schema.salesAgents, eq(schema.salesAgents.id, schema.salesConversations.agentId))
    .leftJoin(schema.salesLeads, eq(schema.salesLeads.id, schema.salesConversations.leadId))
    .where(and(...conditions))
    .orderBy(desc(schema.salesConversations.lastMessageAt))
    .limit(200);
}

export async function setConversationStatus(conversationId: string, status: (typeof schema.salesConversationStatusEnum.enumValues)[number]) {
  const db = getDb();
  await db.update(schema.salesConversations).set({ status }).where(eq(schema.salesConversations.id, conversationId));
}

export async function linkConversationLead(conversationId: string, leadId: string) {
  const db = getDb();
  await db.update(schema.salesConversations).set({ leadId }).where(eq(schema.salesConversations.id, conversationId));
}

export async function appendMessage(input: {
  conversationId: string;
  role: (typeof schema.salesMessageRoleEnum.enumValues)[number];
  content: string;
  debug?: Record<string, unknown>;
}) {
  const db = getDb();
  const [message] = await db
    .insert(schema.salesMessages)
    .values({ conversationId: input.conversationId, role: input.role, content: input.content, debug: input.debug })
    .returning();
  await db.update(schema.salesConversations).set({ lastMessageAt: new Date() }).where(eq(schema.salesConversations.id, input.conversationId));
  return message;
}

/** Wipes a conversation's transcript and lead linkage in place (test conversations only — see the API route's guard). */
export async function clearConversationMessages(conversationId: string) {
  const db = getDb();
  await db.delete(schema.salesMessages).where(eq(schema.salesMessages.conversationId, conversationId));
  await db
    .update(schema.salesConversations)
    .set({ leadId: null, status: "active", lastMessageAt: new Date() })
    .where(eq(schema.salesConversations.id, conversationId));
}

export async function listMessages(conversationId: string) {
  const db = getDb();
  return db.query.salesMessages.findMany({
    where: eq(schema.salesMessages.conversationId, conversationId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
}

// ---------------------------------------------------------------------------
// Leads & qualification
// ---------------------------------------------------------------------------

type LeadPatch = Partial<
  Pick<typeof schema.salesLeads.$inferInsert, "name" | "email" | "phone" | "company" | "interest" | "budget" | "timeline" | "notes" | "source">
>;

export async function getLeadForConversation(orgId: string, conversationId: string) {
  const db = getDb();
  const conversation = await getConversation(orgId, conversationId);
  if (!conversation?.leadId) return null;
  return db.query.salesLeads.findFirst({ where: eq(schema.salesLeads.id, conversation.leadId) });
}

/** Creates the lead on first contact info captured in a conversation, or updates the existing one. Always returns the lead. */
export async function upsertLeadForConversation(orgId: string, agentId: string, conversationId: string, patch: LeadPatch) {
  const db = getDb();
  const conversation = await getConversation(orgId, conversationId);
  if (!conversation) throw new Error(`Conversation ${conversationId} not found.`);

  if (conversation.leadId) {
    const [lead] = await db
      .update(schema.salesLeads)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.salesLeads.id, conversation.leadId))
      .returning();
    return lead;
  }

  const [lead] = await db
    .insert(schema.salesLeads)
    .values({ orgId, agentId, ...patch })
    .returning();
  if (!lead) throw new Error("Failed to create lead.");
  await linkConversationLead(conversationId, lead.id);
  return lead;
}

/** Direct human edit of a lead's contact fields/notes from the Leads UI (as opposed to the agent's conversation-scoped upsert). */
export async function updateLeadFields(orgId: string, leadId: string, patch: LeadPatch) {
  const db = getDb();
  const [lead] = await db
    .update(schema.salesLeads)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.salesLeads.id, leadId), eq(schema.salesLeads.orgId, orgId)))
    .returning();
  return lead;
}

export async function setLeadStatus(leadId: string, status: (typeof schema.salesLeadStatusEnum.enumValues)[number], reason: string) {
  const db = getDb();
  const [lead] = await db
    .update(schema.salesLeads)
    .set({ status, statusReason: reason, updatedAt: new Date() })
    .where(eq(schema.salesLeads.id, leadId))
    .returning();
  return lead;
}

export async function recordQualification(input: {
  leadId: string;
  conversationId?: string;
  status: (typeof schema.salesLeadStatusEnum.enumValues)[number];
  criteria: Record<string, unknown>;
  reason: string;
}) {
  const db = getDb();
  const [record] = await db
    .insert(schema.salesLeadQualifications)
    .values({ leadId: input.leadId, conversationId: input.conversationId, status: input.status, criteria: input.criteria, reason: input.reason })
    .returning();
  await setLeadStatus(input.leadId, input.status, input.reason);
  return record;
}

export async function listQualificationHistory(leadId: string) {
  const db = getDb();
  return db.query.salesLeadQualifications.findMany({
    where: eq(schema.salesLeadQualifications.leadId, leadId),
    orderBy: (q, { desc }) => [desc(q.createdAt)],
  });
}

export async function getLead(orgId: string, leadId: string) {
  const db = getDb();
  return db.query.salesLeads.findFirst({ where: and(eq(schema.salesLeads.id, leadId), eq(schema.salesLeads.orgId, orgId)) });
}

export async function listLeads(
  orgId: string,
  filters: { status?: string; agentId?: string; since?: Date } = {},
) {
  const db = getDb();
  const conditions = [eq(schema.salesLeads.orgId, orgId)];
  if (filters.status) conditions.push(eq(schema.salesLeads.status, filters.status as never));
  if (filters.agentId) conditions.push(eq(schema.salesLeads.agentId, filters.agentId));
  if (filters.since) conditions.push(gte(schema.salesLeads.createdAt, filters.since));

  return db
    .select({ lead: schema.salesLeads, agentName: schema.salesAgents.name })
    .from(schema.salesLeads)
    .leftJoin(schema.salesAgents, eq(schema.salesAgents.id, schema.salesLeads.agentId))
    .where(and(...conditions))
    .orderBy(desc(schema.salesLeads.createdAt))
    .limit(500);
}

export async function countLeadsSince(orgId: string, since?: Date): Promise<number> {
  const db = getDb();
  const conditions = [eq(schema.salesLeads.orgId, orgId)];
  if (since) conditions.push(gte(schema.salesLeads.createdAt, since));
  const [row] = await db.select({ n: count() }).from(schema.salesLeads).where(and(...conditions));
  return row?.n ?? 0;
}

export async function countLeadsByStatus(orgId: string, statuses: string[]): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: count() })
    .from(schema.salesLeads)
    .where(and(eq(schema.salesLeads.orgId, orgId), inArray(schema.salesLeads.status, statuses as never[])));
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export async function createMeeting(input: {
  orgId: string;
  leadId: string;
  conversationId?: string;
  agentId?: string;
  proposedTime?: Date;
  durationMinutes?: number;
  notes?: string;
}) {
  const db = getDb();
  const [meeting] = await db.insert(schema.salesMeetings).values(input).returning();
  return meeting;
}

export async function listMeetingsForLead(leadId: string) {
  const db = getDb();
  return db.query.salesMeetings.findMany({ where: eq(schema.salesMeetings.leadId, leadId), orderBy: (m, { desc }) => [desc(m.createdAt)] });
}

export async function countMeetingsSince(orgId: string, since?: Date): Promise<number> {
  const db = getDb();
  const conditions = [eq(schema.salesMeetings.orgId, orgId)];
  if (since) conditions.push(gte(schema.salesMeetings.createdAt, since));
  const [row] = await db.select({ n: count() }).from(schema.salesMeetings).where(and(...conditions));
  return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Handoffs
// ---------------------------------------------------------------------------

export async function createHandoff(input: { orgId: string; conversationId: string; leadId?: string; reason: string }) {
  const db = getDb();
  const [handoff] = await db.insert(schema.salesHandoffs).values(input).returning();
  await setConversationStatus(input.conversationId, "handoff");
  return handoff;
}

export async function listHandoffs(orgId: string, status?: string) {
  const db = getDb();
  const conditions = [eq(schema.salesHandoffs.orgId, orgId)];
  if (status) conditions.push(eq(schema.salesHandoffs.status, status as never));
  return db.query.salesHandoffs.findMany({ where: and(...conditions), orderBy: (h, { desc }) => [desc(h.createdAt)] });
}

export async function resolveHandoff(orgId: string, handoffId: string, assignedTo?: string) {
  const db = getDb();
  const [handoff] = await db
    .update(schema.salesHandoffs)
    .set({ status: "resolved", resolvedAt: new Date(), assignedTo })
    .where(and(eq(schema.salesHandoffs.id, handoffId), eq(schema.salesHandoffs.orgId, orgId)))
    .returning();
  if (handoff) await setConversationStatus(handoff.conversationId, "active");
  return handoff;
}

/** The most recent handoff row raised for a conversation, if any — used by the Conversation detail page's "Resolve handoff" action. */
export async function getHandoffForConversation(orgId: string, conversationId: string) {
  const db = getDb();
  return db.query.salesHandoffs.findFirst({
    where: and(eq(schema.salesHandoffs.conversationId, conversationId), eq(schema.salesHandoffs.orgId, orgId)),
    orderBy: (h, { desc }) => [desc(h.createdAt)],
  });
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getOverviewStats(orgId: string) {
  const db = getDb();
  const [conversationRows, agentRows] = await Promise.all([
    db.select({ n: count() }).from(schema.salesConversations).where(and(eq(schema.salesConversations.orgId, orgId), eq(schema.salesConversations.isTest, false))),
    db.select({ n: count() }).from(schema.salesAgents).where(eq(schema.salesAgents.orgId, orgId)),
  ]);
  const totalConversations = conversationRows[0]?.n ?? 0;
  const totalAgents = agentRows[0]?.n ?? 0;

  const [activeAgents, totalLeads, qualifiedLeads, meetingsBooked] = await Promise.all([
    countActiveAgents(orgId),
    countLeadsSince(orgId),
    countLeadsByStatus(orgId, ["qualified", "meeting_requested", "meeting_booked"]),
    countMeetingsSince(orgId),
  ]);

  const conversionRate = totalConversations > 0 ? qualifiedLeads / totalConversations : 0;

  return { activeAgents, totalAgents, totalConversations, totalLeads, qualifiedLeads, meetingsBooked, conversionRate };
}

export async function getConversationsPerDay(orgId: string, days = 14) {
  const db = getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ day: sql<string>`date_trunc('day', ${schema.salesConversations.startedAt})::date::text`, n: count() })
    .from(schema.salesConversations)
    .where(and(eq(schema.salesConversations.orgId, orgId), eq(schema.salesConversations.isTest, false), gte(schema.salesConversations.startedAt, since)))
    .groupBy(sql`date_trunc('day', ${schema.salesConversations.startedAt})`)
    .orderBy(sql`date_trunc('day', ${schema.salesConversations.startedAt})`);
  return rows;
}

export async function getLeadFunnel(orgId: string) {
  const db = getDb();
  const rows = await db
    .select({ status: schema.salesLeads.status, n: count() })
    .from(schema.salesLeads)
    .where(eq(schema.salesLeads.orgId, orgId))
    .groupBy(schema.salesLeads.status);
  return rows;
}

/** Tool usage restricted to tools attached to at least one sales agent (keeps this org's internal-platform tool usage, if any, out of Sales Analytics). */
export interface RecentActivityRow {
  id: string;
  status: (typeof schema.salesLeadStatusEnum.enumValues)[number];
  reason: string;
  createdAt: Date;
  leadId: string;
  leadName: string | null;
  agentName: string | null;
}

/** Recent lead-status transitions across the org, newest first — the Overview page's "Recent Agent Activity" feed (every entry is a real, reasoned state change, not a synthetic log line). */
export async function listRecentActivity(orgId: string, limit = 10): Promise<RecentActivityRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.salesLeadQualifications.id,
      status: schema.salesLeadQualifications.status,
      reason: schema.salesLeadQualifications.reason,
      createdAt: schema.salesLeadQualifications.createdAt,
      leadId: schema.salesLeads.id,
      leadName: schema.salesLeads.name,
      agentName: schema.salesAgents.name,
    })
    .from(schema.salesLeadQualifications)
    .innerJoin(schema.salesLeads, eq(schema.salesLeads.id, schema.salesLeadQualifications.leadId))
    .leftJoin(schema.salesAgents, eq(schema.salesAgents.id, schema.salesLeads.agentId))
    .where(eq(schema.salesLeads.orgId, orgId))
    .orderBy(desc(schema.salesLeadQualifications.createdAt))
    .limit(limit);
  return rows;
}

export interface AgentStatsRow {
  agentId: string;
  conversationCount: number;
  qualifiedLeadCount: number;
  lastActivityAt: Date | null;
}

/** Per-agent conversation/qualification counters for the Sales Agents list — real aggregates, no placeholders. */
export async function getAgentStats(orgId: string): Promise<Record<string, AgentStatsRow>> {
  const db = getDb();
  const [conversationRows, leadRows] = await Promise.all([
    db
      .select({
        agentId: schema.salesConversations.agentId,
        n: count(),
        lastActivityAt: sql<Date>`max(${schema.salesConversations.lastMessageAt})`,
      })
      .from(schema.salesConversations)
      .where(and(eq(schema.salesConversations.orgId, orgId), eq(schema.salesConversations.isTest, false)))
      .groupBy(schema.salesConversations.agentId),
    db
      .select({ agentId: schema.salesLeads.agentId, n: count() })
      .from(schema.salesLeads)
      .where(
        and(
          eq(schema.salesLeads.orgId, orgId),
          inArray(schema.salesLeads.status, ["qualified", "meeting_requested", "meeting_booked"]),
        ),
      )
      .groupBy(schema.salesLeads.agentId),
  ]);

  const result: Record<string, AgentStatsRow> = {};
  for (const row of conversationRows) {
    if (!row.agentId) continue;
    result[row.agentId] = {
      agentId: row.agentId,
      conversationCount: row.n,
      qualifiedLeadCount: 0,
      lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt) : null,
    };
  }
  for (const row of leadRows) {
    if (!row.agentId) continue;
    const existing = result[row.agentId] ?? { agentId: row.agentId, conversationCount: 0, qualifiedLeadCount: 0, lastActivityAt: null };
    existing.qualifiedLeadCount = row.n;
    result[row.agentId] = existing;
  }
  return result;
}

export async function getSalesToolUsage(orgId: string) {
  const db = getDb();
  const rows = await db
    .select({
      toolId: schema.tools.id,
      toolName: schema.tools.name,
      totalCalls: count(schema.toolExecutions.id),
      successCalls: sql<string>`count(*) filter (where ${schema.toolExecutions.status} = 'success')`,
      errorCalls: sql<string>`count(*) filter (where ${schema.toolExecutions.status} = 'error')`,
    })
    .from(schema.salesAgentTools)
    .innerJoin(schema.tools, eq(schema.tools.id, schema.salesAgentTools.toolId))
    .leftJoin(schema.toolExecutions, eq(schema.toolExecutions.toolId, schema.tools.id))
    .where(inArray(schema.salesAgentTools.agentId, db.select({ id: schema.salesAgents.id }).from(schema.salesAgents).where(eq(schema.salesAgents.orgId, orgId))))
    .groupBy(schema.tools.id, schema.tools.name);

  return rows.map((r) => ({
    toolId: r.toolId,
    toolName: r.toolName,
    totalCalls: Number(r.totalCalls),
    successCalls: Number(r.successCalls),
    errorCalls: Number(r.errorCalls),
  }));
}
