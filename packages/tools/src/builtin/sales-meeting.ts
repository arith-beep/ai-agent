import { bookMeetingToolInputSchema, type BookMeetingToolInput } from "@ai-agent/shared-types";
import { salesRepo } from "@ai-agent/storage";
import type { BuiltinToolImplementation } from "../types";

export const salesMeetingBookTool: BuiltinToolImplementation<BookMeetingToolInput> = {
  key: "sales_meeting_book",
  name: "Book Meeting",
  description:
    "Requests a meeting/demo at a time the lead actually proposed or agreed to. This does not check a real calendar for availability — it records the request; a human confirms it. Never tell the lead a time is confirmed unless this tool has actually run.",
  category: "agent",
  inputSchema: bookMeetingToolInputSchema,
  inputJsonSchema: {
    type: "object",
    properties: {
      proposedTime: { type: "string", format: "date-time" },
      durationMinutes: { type: "number", default: 30 },
      notes: { type: "string" },
    },
    required: ["proposedTime"],
  },
  async execute(input, ctx) {
    if (!ctx.conversationId) throw new Error("sales_meeting_book requires an active conversation context.");

    const lead = await salesRepo.getLeadForConversation(ctx.orgId, ctx.conversationId);
    if (!lead) {
      throw new Error(
        "No lead is linked to this conversation yet. Call sales_lead_upsert with at least the lead's name or email before requesting a meeting.",
      );
    }

    const meeting = await salesRepo.createMeeting({
      orgId: ctx.orgId,
      leadId: lead.id,
      conversationId: ctx.conversationId,
      agentId: ctx.agentId,
      proposedTime: new Date(input.proposedTime),
      durationMinutes: input.durationMinutes,
      notes: input.notes,
    });
    if (!meeting) throw new Error("Failed to create meeting request.");

    await salesRepo.recordQualification({
      leadId: lead.id,
      conversationId: ctx.conversationId,
      status: "meeting_requested",
      criteria: {},
      reason: `Requested a meeting for ${input.proposedTime}.`,
    });

    return { meetingId: meeting.id, status: meeting.status, proposedTime: input.proposedTime };
  },
};
