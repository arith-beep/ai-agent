import { z } from "zod";

export const spanTypeSchema = z.enum([
  "agent_run",
  "model_call",
  "tool_call",
  "workflow_step",
  "knowledge_retrieval",
  "agent_message",
]);
export type SpanType = z.infer<typeof spanTypeSchema>;

export const spanStatusSchema = z.enum(["running", "success", "error"]);
export type SpanStatus = z.infer<typeof spanStatusSchema>;
