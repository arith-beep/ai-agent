import { z } from "zod";

/**
 * Structured execution events streamed to the Playground/trace UI while an
 * agent or workflow run is in progress. Deliberately does NOT include a
 * "reasoning"/"thinking" variant: provider chain-of-thought is never
 * forwarded to storage or the client, only these structured events are.
 */
export const executionEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("run-started"), runId: z.string().uuid(), at: z.string().datetime() }),
  z.object({ type: z.literal("text-delta"), runId: z.string().uuid(), text: z.string() }),
  z.object({
    type: z.literal("tool-call-start"),
    runId: z.string().uuid(),
    spanId: z.string().uuid(),
    toolName: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("tool-call-result"),
    runId: z.string().uuid(),
    spanId: z.string().uuid(),
    toolName: z.string(),
    output: z.unknown(),
    status: z.enum(["success", "error"]),
  }),
  z.object({
    type: z.literal("knowledge-retrieval"),
    runId: z.string().uuid(),
    spanId: z.string().uuid(),
    query: z.string(),
    results: z.array(z.object({ chunkId: z.string().uuid(), content: z.string(), score: z.number(), source: z.string().optional() })),
  }),
  z.object({
    type: z.literal("agent-message"),
    runId: z.string().uuid(),
    direction: z.enum(["outgoing", "incoming"]),
    withAgentId: z.string().uuid(),
    kind: z.string(),
  }),
  z.object({ type: z.literal("approval-required"), runId: z.string().uuid(), approvalId: z.string().uuid(), actionType: z.string() }),
  z.object({
    type: z.literal("run-completed"),
    runId: z.string().uuid(),
    output: z.unknown(),
    tokenUsage: z.object({ promptTokens: z.number(), completionTokens: z.number(), totalTokens: z.number() }),
    estimatedCost: z.number(),
    durationMs: z.number(),
  }),
  z.object({ type: z.literal("run-failed"), runId: z.string().uuid(), errorMessage: z.string() }),
]);
export type ExecutionEvent = z.infer<typeof executionEventSchema>;
