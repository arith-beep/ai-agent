import { requestHandoffToolInputSchema, type RequestHandoffToolInput } from "@ai-agent/shared-types";
import { salesRepo } from "@ai-agent/storage";
import type { BuiltinToolImplementation } from "../types";

export const salesHumanHandoffTool: BuiltinToolImplementation<RequestHandoffToolInput> = {
  key: "sales_human_handoff",
  name: "Request Human Handoff",
  description:
    "Marks this conversation as requiring a human to take over — use this whenever a guardrail is triggered, the lead is upset, asks for something outside what you can help with, or explicitly asks for a person. After calling this, tell the lead a team member will follow up; do not keep negotiating on the org's behalf.",
  category: "communication",
  inputSchema: requestHandoffToolInputSchema,
  inputJsonSchema: {
    type: "object",
    properties: {
      reason: { type: "string" },
      urgency: { type: "string", enum: ["low", "normal", "high"], default: "normal" },
    },
    required: ["reason"],
  },
  async execute(input, ctx) {
    if (!ctx.conversationId) throw new Error("sales_human_handoff requires an active conversation context.");

    const lead = await salesRepo.getLeadForConversation(ctx.orgId, ctx.conversationId);
    const handoff = await salesRepo.createHandoff({
      orgId: ctx.orgId,
      conversationId: ctx.conversationId,
      leadId: lead?.id,
      reason: `[${input.urgency}] ${input.reason}`,
    });
    if (!handoff) throw new Error("Failed to create handoff.");

    if (lead) {
      await salesRepo.recordQualification({
        leadId: lead.id,
        conversationId: ctx.conversationId,
        status: "human_handoff",
        criteria: {},
        reason: input.reason,
      });
    }

    return { handoffId: handoff.id, status: handoff.status };
  },
};
