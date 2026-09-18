/**
 * In-memory demo data + demo repository implementations, used only when DEMO_MODE=true
 * (see repositories/index.ts, which proxies salesRepo/toolsRepo to these when active).
 * State lives for the lifetime of the warm serverless instance — fine for a live demo,
 * not a substitute for the real Supabase-backed repositories.
 */

export const DEMO_ORG_ID = "ec2deb92-dab3-439c-81a3-a1a95569eddb";
export const DEMO_USER_ID = "834ca121-c64f-4d93-9a10-b092dd320f9c";
const AGENT_ID = "0201ca3c-ef69-4319-9a2e-72cc8f2bb3ba";
const KNOW1 = "205be721-bfce-4cf3-8c59-7edd4e6d6bd5";
const KNOW2 = "91ca8a50-2e64-4a2f-8522-18ef932a9053";
const TOOL1 = "2f84d806-d22c-45f0-a7a1-5fcba04e3cfa";
const TOOL2 = "cf5a4fee-4878-4468-a417-3d1e0527238a";
const TOOL3 = "77c6ca5e-3caa-4fcc-9d35-69c0dd11290e";
const LEAD1 = "92df4f3f-23de-43fd-b91c-a3be39553a96";
const LEAD2 = "f73fae8f-d512-445a-b302-ddd3b079cd66";
const LEAD3 = "2fe55074-75aa-4d6e-a6d6-6a3296f2261c";
const CONV1 = "6f5e04ee-6ec2-4407-ba1e-345b0f066625";
const CONV2 = "fc2390f8-4bec-4d19-afdb-3f3e56693589";
const QUAL1 = "b3e02781-1f7b-4dce-9176-54d873b13851";
const MEET1 = "47d5325c-95f4-4cd8-a500-1720979a6319";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const now = () => new Date();
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

interface DemoState {
  agent: Record<string, unknown>;
  knowledgeSources: Record<string, unknown>[];
  tools: Record<string, unknown>[];
  agentTools: { agentId: string; toolId: string; enabled: boolean; config: Record<string, unknown> }[];
  leads: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  qualifications: Record<string, unknown>[];
  meetings: Record<string, unknown>[];
  handoffs: Record<string, unknown>[];
  agentVersions: Record<string, unknown>[];
}

function seed(): DemoState {
  return {
    agent: {
      id: AGENT_ID,
      orgId: DEMO_ORG_ID,
      name: "Nova",
      companyName: "Aurora Robotics",
      role: "Senior Sales Development Rep",
      description: "Qualifies inbound interest in Aurora's warehouse automation robots and books demos with the AE team.",
      language: "en",
      tone: "consultative",
      personality: ["warm", "sharp", "no-nonsense"],
      playbook: {
        primaryObjective: "Qualify inbound leads on budget, timeline, and warehouse size, then book a live demo.",
        targetCustomer: "Operations and logistics leaders at mid-market warehousing and 3PL companies.",
        salesProcess: "Discover pain -> confirm fit (BANT) -> propose a 20-min demo -> hand off to AE.",
        qualificationCriteria: [
          { name: "Warehouse size", description: "At least 20,000 sq ft of active floor space." },
          { name: "Budget", description: "Can realistically fund a 6-figure automation pilot." },
          { name: "Timeline", description: "Looking to deploy within the next 2 quarters." },
        ],
        qualificationQuestions: ["How large is your current warehouse footprint?", "What's driving the automation push right now?"],
        discoveryQuestions: ["What's slowing your fulfillment down today?", "Have you evaluated automation vendors before?"],
        valueProposition: "Aurora's robots cut pick-time by 40% with a 6-week install, no warehouse retrofit required.",
        productPositioning: "The fastest warehouse robotics deployment on the market.",
        objectionHandling: [{ objection: "We tried automation before and it failed.", response: "Ask what specifically failed — most legacy systems required a full retrofit; Aurora doesn't." }],
        cta: "Book a 20-minute live demo with our automation engineer.",
        closingBehavior: "Always propose two concrete meeting times before ending the conversation.",
        followUpBehavior: "If no response in 3 days, send one friendly nudge referencing their stated timeline.",
      },
      guardrails: {
        allowedTopics: ["warehouse automation", "pricing tiers", "implementation timeline"],
        disallowedTopics: ["competitor disparagement", "unreleased product roadmap"],
        escalationTriggers: ["the lead asks for a contract or legal terms", "the lead becomes frustrated"],
        prohibitedClaims: ["guaranteed ROI numbers", "specific delivery dates before a site survey"],
        requiredInfoBeforeActions: [{ action: "book_meeting", requiredFields: ["email", "company"] }],
        maxAutonomy: "act_with_confirmation",
      },
      modelProvider: "openai",
      modelName: "gpt-4o-mini",
      temperature: 0.5,
      maxTokens: 2048,
      status: "active",
      avatarUrl: null,
      createdBy: DEMO_USER_ID,
      createdAt: daysAgo(12),
      updatedAt: hoursAgo(3),
    },
    knowledgeSources: [
      {
        id: KNOW1,
        orgId: DEMO_ORG_ID,
        agentId: AGENT_ID,
        name: "Aurora Pricing & Packages",
        type: "text",
        sourceUri: "Starter tier: $8k/mo. Growth tier: $22k/mo. Enterprise: custom. All tiers include install and 24/7 support.",
        status: "ready",
        errorMessage: null,
        createdBy: DEMO_USER_ID,
        createdAt: daysAgo(10),
      },
      {
        id: KNOW2,
        orgId: DEMO_ORG_ID,
        agentId: AGENT_ID,
        name: "Implementation Timeline FAQ",
        type: "text",
        sourceUri: "Typical install takes 6 weeks from signed contract: 1 week site survey, 3 weeks hardware install, 2 weeks staff training.",
        status: "ready",
        errorMessage: null,
        createdBy: DEMO_USER_ID,
        createdAt: daysAgo(9),
      },
    ],
    tools: [
      { id: TOOL1, orgId: DEMO_ORG_ID, name: "Capture Lead", description: "Creates or updates a lead record from conversation details.", category: "agent", inputSchema: {}, outputSchema: null, requiresApproval: false, builtinKey: "sales_lead_upsert", createdBy: DEMO_USER_ID, createdAt: daysAgo(12) },
      { id: TOOL2, orgId: DEMO_ORG_ID, name: "Book Meeting", description: "Books a demo meeting for a qualified lead.", category: "agent", inputSchema: {}, outputSchema: null, requiresApproval: false, builtinKey: "sales_meeting_book", createdBy: DEMO_USER_ID, createdAt: daysAgo(12) },
      { id: TOOL3, orgId: DEMO_ORG_ID, name: "Escalate to Human", description: "Hands the conversation off to a human rep.", category: "communication", inputSchema: {}, outputSchema: null, requiresApproval: false, builtinKey: "sales_handoff", createdBy: DEMO_USER_ID, createdAt: daysAgo(12) },
    ],
    agentTools: [
      { agentId: AGENT_ID, toolId: TOOL1, enabled: true, config: {} },
      { agentId: AGENT_ID, toolId: TOOL2, enabled: true, config: {} },
    ],
    leads: [
      { id: LEAD1, orgId: DEMO_ORG_ID, agentId: AGENT_ID, name: "Priya Natarajan", email: "priya@northfield-logistics.com", phone: "+1-555-0142", company: "Northfield Logistics", interest: "Pick-and-pack automation", budget: "$150k-$300k", timeline: "Next quarter", status: "qualified", statusReason: "Confirmed 45,000 sq ft warehouse, budget approved, timeline within 2 quarters.", notes: "Very engaged, asked detailed pricing questions.", source: "agent_conversation", createdAt: daysAgo(4), updatedAt: hoursAgo(6) },
      { id: LEAD2, orgId: DEMO_ORG_ID, agentId: AGENT_ID, name: "Marcus Webb", email: "marcus@fastship3pl.com", phone: "+1-555-0198", company: "FastShip 3PL", interest: "Warehouse robotics evaluation", budget: "Not yet confirmed", timeline: "Exploring", status: "meeting_booked", statusReason: "Booked a demo for Thursday 2pm with the automation engineer.", notes: "Wants a live demo before committing budget.", source: "agent_conversation", createdAt: daysAgo(2), updatedAt: hoursAgo(1) },
      { id: LEAD3, orgId: DEMO_ORG_ID, agentId: AGENT_ID, name: "Dana Osei", email: "dana@quickcrate.io", phone: null, company: "QuickCrate", interest: "General inquiry", budget: null, timeline: null, status: "new", statusReason: null, notes: null, source: "agent_conversation", createdAt: hoursAgo(5), updatedAt: hoursAgo(5) },
    ],
    conversations: [
      {
        id: CONV1,
        orgId: DEMO_ORG_ID,
        agentId: AGENT_ID,
        leadId: LEAD1,
        channel: "playground",
        status: "active",
        isTest: false,
        startedAt: daysAgo(4),
        lastMessageAt: hoursAgo(6),
      },
      {
        id: CONV2,
        orgId: DEMO_ORG_ID,
        agentId: AGENT_ID,
        leadId: LEAD2,
        channel: "playground",
        status: "active",
        isTest: false,
        startedAt: daysAgo(2),
        lastMessageAt: hoursAgo(1),
      },
    ],
    messages: [
      { id: uid("msg"), conversationId: CONV1, role: "user", content: "Hi, we're looking into warehouse automation for our Northfield facility.", debug: null, createdAt: daysAgo(4) },
      { id: uid("msg"), conversationId: CONV1, role: "assistant", content: "Great to meet you! To point you to the right setup — roughly how large is your active warehouse floor space?", debug: null, createdAt: daysAgo(4) },
      { id: uid("msg"), conversationId: CONV1, role: "user", content: "About 45,000 sq ft, and we have budget approved for next quarter.", debug: null, createdAt: hoursAgo(6) },
      { id: uid("msg"), conversationId: CONV1, role: "assistant", content: "That's a great fit for our Growth tier. I've noted you as qualified — I'd love to get you on a call with our automation engineer.", debug: null, createdAt: hoursAgo(6) },
      { id: uid("msg"), conversationId: CONV2, role: "user", content: "Can we see a live demo before we commit to anything?", debug: null, createdAt: daysAgo(2) },
      { id: uid("msg"), conversationId: CONV2, role: "assistant", content: "Of course — I've booked you in for Thursday at 2pm with our automation engineer. Does that work?", debug: null, createdAt: hoursAgo(1) },
    ],
    qualifications: [
      { id: QUAL1, leadId: LEAD1, conversationId: CONV1, status: "qualified", criteria: { warehouseSize: "45,000 sq ft", budget: "approved", timeline: "next quarter" }, reason: "Confirmed warehouse size, approved budget, and timeline within 2 quarters.", createdAt: hoursAgo(6) },
      { id: uid("qual"), leadId: LEAD2, conversationId: CONV2, status: "meeting_booked", criteria: { meetingTime: "Thursday 2pm" }, reason: "Lead requested a live demo and accepted the proposed time.", createdAt: hoursAgo(1) },
    ],
    meetings: [
      { id: MEET1, orgId: DEMO_ORG_ID, leadId: LEAD2, conversationId: CONV2, agentId: AGENT_ID, proposedTime: hoursAgo(-44), durationMinutes: 30, status: "confirmed", notes: "Live product demo with automation engineer.", createdAt: hoursAgo(1) },
    ],
    handoffs: [],
    agentVersions: [],
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __aiAgentDemoState: DemoState | undefined;
}

function state(): DemoState {
  if (!globalThis.__aiAgentDemoState) globalThis.__aiAgentDemoState = seed();
  return globalThis.__aiAgentDemoState;
}

function toolRow(toolId: string) {
  return state().tools.find((t) => t.id === toolId);
}

export const demoSalesRepo = {
  async createAgent(orgId: string, createdBy: string, input: Record<string, unknown>) {
    // Demo is single-agent by design — creating a second agent would fragment the seeded
    // story, so this points back at the one seeded agent rather than silently no-op'ing.
    return demoSalesRepo.getAgentById(orgId, AGENT_ID);
  },
  async getAgentById(orgId: string, agentId: string) {
    const a = state().agent;
    if (a.orgId !== orgId || a.id !== agentId) return undefined;
    return a;
  },
  async listAgents(orgId: string) {
    return orgId === DEMO_ORG_ID ? [state().agent] : [];
  },
  async updateAgent(orgId: string, agentId: string, patch: Record<string, unknown>) {
    const s = state();
    if (s.agent.orgId !== orgId || s.agent.id !== agentId) return undefined;
    s.agent = { ...s.agent, ...patch, updatedAt: now() };
    return s.agent;
  },
  async createAgentVersion(input: { agentId: string; configSnapshot: Record<string, unknown>; generatedSystemPrompt: string; createdBy: string }) {
    const s = state();
    const version = { id: uid("ver"), agentId: input.agentId, versionNumber: s.agentVersions.length + 1, configSnapshot: input.configSnapshot, generatedSystemPrompt: input.generatedSystemPrompt, createdBy: input.createdBy, createdAt: now() };
    s.agentVersions.push(version);
    return version;
  },
  async listAgentVersions(agentId: string) {
    return state().agentVersions.filter((v) => v.agentId === agentId);
  },
  async attachTool(agentId: string, toolId: string, config?: Record<string, unknown>) {
    const s = state();
    const existing = s.agentTools.find((t) => t.agentId === agentId && t.toolId === toolId);
    if (existing) {
      existing.enabled = true;
      existing.config = config ?? {};
      return existing;
    }
    const row = { agentId, toolId, enabled: true, config: config ?? {} };
    s.agentTools.push(row);
    return row;
  },
  async setAgentToolEnabled(agentId: string, toolId: string, enabled: boolean) {
    const row = state().agentTools.find((t) => t.agentId === agentId && t.toolId === toolId);
    if (row) row.enabled = enabled;
  },
  async detachTool(agentId: string, toolId: string) {
    const s = state();
    s.agentTools = s.agentTools.filter((t) => !(t.agentId === agentId && t.toolId === toolId));
  },
  async listAgentTools(agentId: string) {
    return state()
      .agentTools.filter((t) => t.agentId === agentId)
      .map((t) => ({ tool: toolRow(t.toolId), enabled: t.enabled, config: t.config }))
      .filter((r) => r.tool);
  },
  async listEnabledAgentTools(agentId: string) {
    const rows = await demoSalesRepo.listAgentTools(agentId);
    return rows.filter((r) => r.enabled).map((r) => r.tool);
  },
  async countAgentsPerTool(orgId: string) {
    if (orgId !== DEMO_ORG_ID) return [];
    const s = state();
    const counts = new Map<string, number>();
    for (const t of s.agentTools) if (t.enabled) counts.set(t.toolId, (counts.get(t.toolId) ?? 0) + 1);
    return Array.from(counts.entries()).map(([toolId, agentCount]) => ({ toolId, agentCount }));
  },
  async createKnowledgeSource(input: { orgId: string; agentId: string; createdBy: string; name: string; type: string; sourceUri: string }) {
    const s = state();
    const source = { id: uid("know"), status: "ready", errorMessage: null, createdAt: now(), ...input };
    s.knowledgeSources.push(source);
    return source;
  },
  async getKnowledgeSource(sourceId: string) {
    return state().knowledgeSources.find((k) => k.id === sourceId);
  },
  async listKnowledgeSourcesForAgent(agentId: string) {
    return state()
      .knowledgeSources.filter((k) => k.agentId === agentId)
      .sort((a, b) => +new Date(b.createdAt as Date) - +new Date(a.createdAt as Date));
  },
  async listAllKnowledgeSourcesForOrg(orgId: string) {
    if (orgId !== DEMO_ORG_ID) return [];
    return state().knowledgeSources.map((source) => ({ source, agentId: state().agent.id, agentName: state().agent.name }));
  },
  async deleteKnowledgeSource(orgId: string, sourceId: string) {
    const s = state();
    if (orgId !== DEMO_ORG_ID) return;
    s.knowledgeSources = s.knowledgeSources.filter((k) => k.id !== sourceId);
  },
  async createConversation(input: { orgId: string; agentId: string; channel?: string; isTest?: boolean }) {
    const s = state();
    const conversation = { id: uid("conv"), orgId: input.orgId, agentId: input.agentId, leadId: null, channel: input.channel ?? "playground", status: "active", isTest: input.isTest ?? false, startedAt: now(), lastMessageAt: now() };
    s.conversations.push(conversation);
    return conversation;
  },
  async getConversation(orgId: string, conversationId: string) {
    return state().conversations.find((c) => c.id === conversationId && c.orgId === orgId);
  },
  async listConversations(orgId: string, filters: { agentId?: string; status?: string; excludeTest?: boolean } = {}) {
    if (orgId !== DEMO_ORG_ID) return [];
    const s = state();
    return s.conversations
      .filter((c) => (filters.agentId ? c.agentId === filters.agentId : true))
      .filter((c) => (filters.status ? c.status === filters.status : true))
      .filter((c) => (filters.excludeTest ? !c.isTest : true))
      .map((c) => {
        const lead = s.leads.find((l) => l.id === c.leadId);
        return { conversation: c, agentName: s.agent.name, leadName: lead?.name ?? null, leadEmail: lead?.email ?? null, leadStatus: lead?.status ?? null };
      })
      .sort((a, b) => +new Date(b.conversation.lastMessageAt as Date) - +new Date(a.conversation.lastMessageAt as Date));
  },
  async setConversationStatus(conversationId: string, status: string) {
    const c = state().conversations.find((c) => c.id === conversationId);
    if (c) c.status = status;
  },
  async linkConversationLead(conversationId: string, leadId: string) {
    const c = state().conversations.find((c) => c.id === conversationId);
    if (c) c.leadId = leadId;
  },
  async appendMessage(input: { conversationId: string; role: string; content: string; debug?: Record<string, unknown> }) {
    const s = state();
    const message = { id: uid("msg"), conversationId: input.conversationId, role: input.role, content: input.content, debug: input.debug ?? null, createdAt: now() };
    s.messages.push(message);
    const c = s.conversations.find((c) => c.id === input.conversationId);
    if (c) c.lastMessageAt = now();
    return message;
  },
  async clearConversationMessages(conversationId: string) {
    const s = state();
    s.messages = s.messages.filter((m) => m.conversationId !== conversationId);
    const c = s.conversations.find((c) => c.id === conversationId);
    if (c) {
      c.leadId = null;
      c.status = "active";
      c.lastMessageAt = now();
    }
  },
  async listMessages(conversationId: string) {
    return state()
      .messages.filter((m) => m.conversationId === conversationId)
      .sort((a, b) => +new Date(a.createdAt as Date) - +new Date(b.createdAt as Date));
  },
  async getLeadForConversation(orgId: string, conversationId: string) {
    const c = state().conversations.find((c) => c.id === conversationId);
    if (!c?.leadId) return null;
    return state().leads.find((l) => l.id === c.leadId) ?? null;
  },
  async updateLeadFields(orgId: string, leadId: string, patch: Record<string, unknown>) {
    const s = state();
    const lead = s.leads.find((l) => l.id === leadId && l.orgId === orgId);
    if (!lead) return undefined;
    Object.assign(lead, patch, { updatedAt: now() });
    return lead;
  },
  async setLeadStatus(leadId: string, status: string, reason: string) {
    const lead = state().leads.find((l) => l.id === leadId);
    if (!lead) return undefined;
    lead.status = status;
    lead.statusReason = reason;
    lead.updatedAt = now();
    return lead;
  },
  async recordQualification(input: { leadId: string; conversationId?: string; status: string; criteria: Record<string, unknown>; reason: string }) {
    const s = state();
    const record = { id: uid("qual"), leadId: input.leadId, conversationId: input.conversationId ?? null, status: input.status, criteria: input.criteria, reason: input.reason, createdAt: now() };
    s.qualifications.push(record);
    await demoSalesRepo.setLeadStatus(input.leadId, input.status, input.reason);
    return record;
  },
  async listQualificationHistory(leadId: string) {
    return state()
      .qualifications.filter((q) => q.leadId === leadId)
      .sort((a, b) => +new Date(b.createdAt as Date) - +new Date(a.createdAt as Date));
  },
  async getLead(orgId: string, leadId: string) {
    return state().leads.find((l) => l.id === leadId && l.orgId === orgId);
  },
  async listLeads(orgId: string, filters: { status?: string; agentId?: string; since?: Date } = {}) {
    if (orgId !== DEMO_ORG_ID) return [];
    const s = state();
    return s.leads
      .filter((l) => (filters.status ? l.status === filters.status : true))
      .filter((l) => (filters.agentId ? l.agentId === filters.agentId : true))
      .filter((l) => (filters.since ? +new Date(l.createdAt as Date) >= +filters.since : true))
      .map((lead) => ({ lead, agentName: s.agent.name }))
      .sort((a, b) => +new Date(b.lead.createdAt as Date) - +new Date(a.lead.createdAt as Date));
  },
  async createMeeting(input: { orgId: string; leadId: string; conversationId?: string; agentId?: string; proposedTime?: Date; durationMinutes?: number; notes?: string }) {
    const s = state();
    const meeting = { id: uid("meet"), status: "requested", createdAt: now(), ...input };
    s.meetings.push(meeting);
    return meeting;
  },
  async listMeetingsForLead(leadId: string) {
    return state()
      .meetings.filter((m) => m.leadId === leadId)
      .sort((a, b) => +new Date(b.createdAt as Date) - +new Date(a.createdAt as Date));
  },
  async createHandoff(input: { orgId: string; conversationId: string; leadId?: string; reason: string }) {
    const s = state();
    const handoff = { id: uid("handoff"), status: "pending", createdAt: now(), resolvedAt: null, assignedTo: null, ...input };
    s.handoffs.push(handoff);
    await demoSalesRepo.setConversationStatus(input.conversationId, "handoff");
    return handoff;
  },
  async listHandoffs(orgId: string, status?: string) {
    if (orgId !== DEMO_ORG_ID) return [];
    return state()
      .handoffs.filter((h) => (status ? h.status === status : true))
      .sort((a, b) => +new Date(b.createdAt as Date) - +new Date(a.createdAt as Date));
  },
  async resolveHandoff(orgId: string, handoffId: string, assignedTo?: string) {
    const handoff = state().handoffs.find((h) => h.id === handoffId && h.orgId === orgId);
    if (!handoff) return undefined;
    handoff.status = "resolved";
    handoff.resolvedAt = now();
    handoff.assignedTo = assignedTo ?? null;
    await demoSalesRepo.setConversationStatus(handoff.conversationId as string, "active");
    return handoff;
  },
  async getHandoffForConversation(orgId: string, conversationId: string) {
    return state()
      .handoffs.filter((h) => h.conversationId === conversationId && h.orgId === orgId)
      .sort((a, b) => +new Date(b.createdAt as Date) - +new Date(a.createdAt as Date))[0];
  },
  async getOverviewStats(orgId: string) {
    if (orgId !== DEMO_ORG_ID) return { activeAgents: 0, totalAgents: 0, totalConversations: 0, totalLeads: 0, qualifiedLeads: 0, meetingsBooked: 0, conversionRate: 0 };
    const s = state();
    const totalConversations = s.conversations.filter((c) => !c.isTest).length;
    const qualifiedLeads = s.leads.filter((l) => ["qualified", "meeting_requested", "meeting_booked"].includes(l.status as string)).length;
    return {
      activeAgents: s.agent.status === "active" ? 1 : 0,
      totalAgents: 1,
      totalConversations,
      totalLeads: s.leads.length,
      qualifiedLeads,
      meetingsBooked: s.meetings.length,
      conversionRate: totalConversations > 0 ? qualifiedLeads / totalConversations : 0,
    };
  },
  async getConversationsPerDay(orgId: string) {
    if (orgId !== DEMO_ORG_ID) return [];
    const buckets = [4, 3, 2, 1, 0].map((d) => {
      const day = daysAgo(d).toISOString().slice(0, 10);
      const n = state().conversations.filter((c) => new Date(c.startedAt as Date).toISOString().slice(0, 10) === day).length;
      return { day, n: n || (d === 2 ? 3 : d === 1 ? 2 : 0) };
    });
    return buckets;
  },
  async getLeadFunnel(orgId: string) {
    if (orgId !== DEMO_ORG_ID) return [];
    const s = state();
    const byStatus = new Map<string, number>();
    for (const l of s.leads) byStatus.set(l.status as string, (byStatus.get(l.status as string) ?? 0) + 1);
    return Array.from(byStatus.entries()).map(([status, n]) => ({ status, n }));
  },
  async listRecentActivity(orgId: string, limit = 10) {
    if (orgId !== DEMO_ORG_ID) return [];
    const s = state();
    return s.qualifications
      .map((q) => {
        const lead = s.leads.find((l) => l.id === q.leadId);
        return { id: q.id, status: q.status, reason: q.reason, createdAt: q.createdAt, leadId: q.leadId, leadName: lead?.name ?? null, agentName: s.agent.name };
      })
      .sort((a, b) => +new Date(b.createdAt as Date) - +new Date(a.createdAt as Date))
      .slice(0, limit);
  },
  async getAgentStats(orgId: string) {
    if (orgId !== DEMO_ORG_ID) return {};
    const s = state();
    const conversationCount = s.conversations.filter((c) => !c.isTest).length;
    const qualifiedLeadCount = s.leads.filter((l) => ["qualified", "meeting_requested", "meeting_booked"].includes(l.status as string)).length;
    const lastActivityAt = s.conversations.reduce<Date | null>((max, c) => {
      const t = new Date(c.lastMessageAt as Date);
      return !max || t > max ? t : max;
    }, null);
    return { [s.agent.id as string]: { agentId: s.agent.id, conversationCount, qualifiedLeadCount, lastActivityAt } };
  },
  async getSalesToolUsage(orgId: string) {
    if (orgId !== DEMO_ORG_ID) return [];
    const s = state();
    return s.agentTools
      .filter((t) => t.enabled)
      .map((t) => {
        const tool = toolRow(t.toolId);
        return { toolId: t.toolId, toolName: tool?.name ?? "Tool", totalCalls: 6, successCalls: 5, errorCalls: 1 };
      });
  },
};

export const demoToolsRepo = {
  async listTools(orgId: string) {
    return orgId === DEMO_ORG_ID ? state().tools : [];
  },
  async getToolById(orgId: string, toolId: string) {
    if (orgId !== DEMO_ORG_ID) return undefined;
    return toolRow(toolId);
  },
  async createTool(orgId: string, createdBy: string, input: Record<string, unknown>) {
    const s = state();
    const tool = { id: uid("tool"), orgId, createdBy, createdAt: now(), ...input };
    s.tools.push(tool);
    return tool;
  },
};

/** Realistic canned assistant reply for the Playground when DEMO_MODE is active — never a real LLM call. */
export function demoAssistantReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes("price") || lower.includes("cost") || lower.includes("pricing")) {
    return "[Simulated demo reply] Our Growth tier runs $22k/mo and covers install plus 24/7 support — want me to check if that fits your warehouse size?";
  }
  if (lower.includes("demo") || lower.includes("meeting") || lower.includes("call")) {
    return "[Simulated demo reply] I can get you on the calendar with our automation engineer — would Thursday at 2pm or Friday at 10am work better?";
  }
  if (lower.includes("timeline") || lower.includes("how long") || lower.includes("install")) {
    return "[Simulated demo reply] Typical install is 6 weeks end-to-end: 1 week site survey, 3 weeks hardware install, 2 weeks staff training.";
  }
  return "[Simulated demo reply] Thanks for sharing that — in a live deployment this would be a real, context-aware response from the agent's configured LLM. Ask about pricing, timeline, or booking a demo to see more of the flow.";
}
