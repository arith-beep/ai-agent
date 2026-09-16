import { upsertLeadToolInputSchema, type UpsertLeadToolInput } from "@ai-agent/shared-types";
import { salesRepo } from "@ai-agent/storage";
import type { BuiltinToolImplementation } from "../types";

function withoutUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export const salesLeadUpsertTool: BuiltinToolImplementation<UpsertLeadToolInput> = {
  key: "sales_lead_upsert",
  name: "Create or Update Lead",
  description:
    "Records or updates the lead's contact and qualification information based ONLY on what they have actually told you in this conversation. Call this progressively as you learn new information — do not wait until the end, and never invent values for fields the lead hasn't provided.",
  category: "agent",
  inputSchema: upsertLeadToolInputSchema,
  inputJsonSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string", format: "email" },
      phone: { type: "string" },
      company: { type: "string" },
      interest: { type: "string" },
      budget: { type: "string" },
      timeline: { type: "string" },
      notes: { type: "string" },
      qualificationStatus: {
        type: "string",
        enum: ["new", "engaged", "qualified", "unqualified", "meeting_requested", "meeting_booked", "human_handoff"],
      },
      qualificationCriteria: { type: "object" },
      statusReason: { type: "string", description: "Required when setting qualificationStatus." },
    },
  },
  async execute(input, ctx) {
    if (!ctx.agentId || !ctx.conversationId) {
      throw new Error("sales_lead_upsert requires an active conversation context.");
    }

    const patch = withoutUndefined({
      name: input.name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      interest: input.interest,
      budget: input.budget,
      timeline: input.timeline,
      notes: input.notes,
    });

    const lead = await salesRepo.upsertLeadForConversation(ctx.orgId, ctx.agentId, ctx.conversationId, patch);
    if (!lead) throw new Error("Failed to persist lead.");

    if (input.qualificationStatus) {
      if (!input.statusReason) {
        throw new Error("statusReason is required when setting qualificationStatus — state specifically what the lead said that supports this status.");
      }
      await salesRepo.recordQualification({
        leadId: lead.id,
        conversationId: ctx.conversationId,
        status: input.qualificationStatus,
        criteria: input.qualificationCriteria ?? {},
        reason: input.statusReason,
      });
    }

    return { leadId: lead.id, status: input.qualificationStatus ?? lead.status };
  },
};
