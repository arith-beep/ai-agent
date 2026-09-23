import type { BuiltinToolImplementation } from "./types";
import { httpRequestTool } from "./builtin/http-request";
import { fileReaderTool } from "./builtin/file-reader";
import { webSearchTool } from "./builtin/web-search";
import { slackSendMessageTool } from "./builtin/slack";
import { githubCreateIssueTool, githubListIssuesTool } from "./builtin/github";
import { googleCalendarCreateEventTool } from "./builtin/google-calendar";
import { databaseQueryTool } from "./builtin/database-query";
import { salesLeadUpsertTool } from "./builtin/sales-lead";
import { salesMeetingBookTool } from "./builtin/sales-meeting";
import { salesHumanHandoffTool } from "./builtin/sales-handoff";

const IMPLEMENTATIONS: BuiltinToolImplementation[] = [
  httpRequestTool,
  fileReaderTool,
  webSearchTool,
  slackSendMessageTool,
  githubCreateIssueTool,
  githubListIssuesTool,
  googleCalendarCreateEventTool,
  databaseQueryTool,
  salesLeadUpsertTool,
  salesMeetingBookTool,
  salesHumanHandoffTool,
] as BuiltinToolImplementation[];

export const BUILTIN_TOOLS: Record<string, BuiltinToolImplementation> = Object.fromEntries(IMPLEMENTATIONS.map((impl) => [impl.key, impl]));

export function getBuiltinTool(key: string): BuiltinToolImplementation | undefined {
  return BUILTIN_TOOLS[key];
}
