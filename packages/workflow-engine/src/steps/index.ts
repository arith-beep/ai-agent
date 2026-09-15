import type { NodeHandler } from "../types";
import { toolStepHandler } from "./tool";
import { llmStepHandler } from "./llm";
import { httpRequestStepHandler, webhookStepHandler } from "./http";
import { dbQueryStepHandler } from "./db-query";
import { transformStepHandler } from "./expression";
import { delayStepHandler, approvalStepHandler, conditionStepHandler } from "./delay-approval";
import { sendMessageStepHandler, createTaskStepHandler } from "./messaging";
import { sendEmailStepHandler } from "./email";

/** Every node type except `agent` (injected by the caller, see engine.ts, to avoid a workflow-engine -> agent-runtime cycle) and `trigger`/`loop` (handled specially by the engine). */
export const defaultHandlers: Partial<Record<string, NodeHandler>> = {
  tool: toolStepHandler,
  llm: llmStepHandler,
  http_request: httpRequestStepHandler,
  webhook: webhookStepHandler,
  db_query: dbQueryStepHandler,
  transform: transformStepHandler,
  condition: conditionStepHandler,
  delay: delayStepHandler,
  approval: approvalStepHandler,
  send_message: sendMessageStepHandler,
  create_task: createTaskStepHandler,
  send_email: sendEmailStepHandler,
  trigger: async (_node, input) => ({ type: "ok", output: input }),
};
