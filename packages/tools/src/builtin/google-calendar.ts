import { z } from "zod";
import type { BuiltinToolImplementation, ToolContext } from "../types";

const inputSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime().describe("ISO 8601 start time"),
  endTime: z.string().datetime().describe("ISO 8601 end time"),
  attendeeEmails: z.array(z.string().email()).optional(),
  calendarId: z.string().default("primary"),
});

/**
 * Creates a Google Calendar event. Requires the tool's authConfig to carry
 * an `accessToken` (a valid OAuth2 bearer token with calendar scope — this
 * platform doesn't run the OAuth flow itself, the token is pasted in under
 * Settings > Tools, same pattern as the other API-key-based integrations).
 */
export const googleCalendarCreateEventTool: BuiltinToolImplementation<z.infer<typeof inputSchema>> = {
  key: "google_calendar_create_event",
  name: "Google Calendar: Create Event",
  description: "Creates an event on a Google Calendar.",
  category: "custom",
  inputSchema,
  inputJsonSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      description: { type: "string" },
      startTime: { type: "string", format: "date-time" },
      endTime: { type: "string", format: "date-time" },
      attendeeEmails: { type: "array", items: { type: "string", format: "email" } },
      calendarId: { type: "string", default: "primary" },
    },
    required: ["summary", "startTime", "endTime"],
  },
  async execute(input, ctx: ToolContext) {
    const accessToken = ctx.authConfig?.accessToken;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new Error("Google Calendar: Create Event is not configured. Add an OAuth access token to this tool under Settings > Tools.");
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startTime },
        end: { dateTime: input.endTime },
        attendees: input.attendeeEmails?.map((email) => ({ email })),
      }),
    });
    const data = (await response.json()) as { id?: string; htmlLink?: string; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${data.error?.message ?? response.statusText}`);
    }
    return { eventId: data.id, htmlLink: data.htmlLink };
  },
};
