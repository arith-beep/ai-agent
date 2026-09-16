import { z } from "zod";

export const jsonPathMapSchema = z.record(z.string(), z.string());

export const triggerConfigSchema = z.object({
  source: z.enum(["manual", "schedule", "webhook", "agent_event"]),
  cronExpression: z.string().optional(),
  eventType: z.string().optional(),
});

const baseNode = z.object({ id: z.string().min(1) });

export const workflowNodeSchema: z.ZodType<WorkflowNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    baseNode.extend({ type: z.literal("trigger"), config: triggerConfigSchema }),
    baseNode.extend({ type: z.literal("agent"), agentId: z.string().uuid(), inputMapping: jsonPathMapSchema.optional() }),
    baseNode.extend({
      type: z.literal("llm"),
      model: z.object({ provider: z.string(), model: z.string() }),
      prompt: z.string(),
    }),
    baseNode.extend({ type: z.literal("tool"), toolId: z.string().uuid(), agentId: z.string().uuid().optional(), inputMapping: jsonPathMapSchema.optional() }),
    baseNode.extend({
      type: z.literal("http_request"),
      config: z.object({
        url: z.string().url(),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
        headers: z.record(z.string(), z.string()).optional(),
        body: z.unknown().optional(),
      }),
    }),
    baseNode.extend({
      type: z.literal("db_query"),
      config: z.object({ query: z.string(), params: z.array(z.unknown()).optional() }),
    }),
    baseNode.extend({ type: z.literal("condition"), expression: z.string() }),
    baseNode.extend({
      type: z.literal("loop"),
      mode: z.enum(["for_each", "while"]),
      over: z.string().optional(),
      condition: z.string().optional(),
      body: z.array(z.lazy(() => workflowNodeSchema)),
      maxIterations: z.number().int().positive().default(100),
    }),
    baseNode.extend({ type: z.literal("delay"), durationMs: z.number().int().positive().optional(), until: z.string().optional() }),
    baseNode.extend({
      type: z.literal("approval"),
      approverRole: z.string().optional(),
      payloadMapping: jsonPathMapSchema.optional(),
    }),
    baseNode.extend({
      type: z.literal("send_email"),
      config: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
    }),
    baseNode.extend({
      type: z.literal("send_message"),
      agentId: z.string().uuid().optional(),
      config: z.object({ toType: z.enum(["human", "agent"]), toId: z.string().uuid(), kind: z.string(), payload: z.record(z.string(), z.unknown()) }),
    }),
    baseNode.extend({
      type: z.literal("create_task"),
      agentId: z.string().uuid().optional(),
      config: z.object({ title: z.string(), description: z.string().optional(), ownerType: z.enum(["human", "agent"]), ownerId: z.string().uuid() }),
    }),
    baseNode.extend({ type: z.literal("webhook"), config: z.object({ path: z.string() }) }),
    baseNode.extend({ type: z.literal("transform"), expression: z.string() }),
  ]),
);

export interface WorkflowNode {
  id: string;
  type:
    | "trigger"
    | "agent"
    | "llm"
    | "tool"
    | "http_request"
    | "db_query"
    | "condition"
    | "loop"
    | "delay"
    | "approval"
    | "send_email"
    | "send_message"
    | "create_task"
    | "webhook"
    | "transform";
  [key: string]: unknown;
}

export const workflowEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  condition: z.string().optional(),
});
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

export const workflowDefinitionSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  entryNodeId: z.string(),
  /** Canvas positions for the visual builder, keyed by node id. Purely presentational — the execution engine never reads this. */
  layout: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional(),
});
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

export const workflowRunStatusSchema = z.enum([
  "queued",
  "running",
  "suspended",
  "completed",
  "failed",
  "cancelled",
]);
export type WorkflowRunStatus = z.infer<typeof workflowRunStatusSchema>;

export interface WorkflowSnapshot {
  currentNodeId: string;
  state: Record<string, unknown>;
  pendingResumeKey?: string;
  loopStack?: Array<{ nodeId: string; index: number }>;
}
