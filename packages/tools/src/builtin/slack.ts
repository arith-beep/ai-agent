import { z } from "zod";
import type { BuiltinToolImplementation, ToolContext } from "../types";

const inputSchema = z.object({
  channel: z.string().min(1).describe("Slack channel ID or name, e.g. #general or C0123456789"),
  text: z.string().min(1),
});

/** Posts a message via the Slack Web API. Requires the tool's authConfig to carry a `botToken` (xoxb-...) with chat:write scope. */
export const slackSendMessageTool: BuiltinToolImplementation<z.infer<typeof inputSchema>> = {
  key: "slack_send_message",
  name: "Slack: Send Message",
  description: "Posts a message to a Slack channel.",
  category: "communication",
  inputSchema,
  inputJsonSchema: {
    type: "object",
    properties: { channel: { type: "string" }, text: { type: "string" } },
    required: ["channel", "text"],
  },
  async execute(input, ctx: ToolContext) {
    const botToken = ctx.authConfig?.botToken;
    if (typeof botToken !== "string" || botToken.length === 0) {
      throw new Error("Slack: Send Message is not configured. Add a bot token (xoxb-...) to this tool under Settings > Tools.");
    }

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { authorization: `Bearer ${botToken}`, "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel: input.channel, text: input.text }),
    });
    const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error ?? "unknown error"}`);
    }
    return { ok: true, ts: data.ts };
  },
};
