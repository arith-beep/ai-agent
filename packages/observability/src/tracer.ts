import { runsRepo } from "@ai-agent/storage";
import type { SpanType, TokenUsage } from "@ai-agent/shared-types";

export async function startTrace(orgId: string, runType: "agent" | "workflow", runId: string) {
  const trace = await runsRepo.createTrace(orgId, runType, runId);
  return { traceId: trace.id };
}

export async function completeTrace(traceId: string, status: "success" | "error") {
  await runsRepo.completeTrace(traceId, status);
}

export async function startSpan(params: {
  traceId: string;
  parentSpanId?: string;
  type: SpanType;
  name: string;
  input?: unknown;
}) {
  const span = await runsRepo.startSpan(params);
  return span;
}

export async function completeSpan(
  spanId: string,
  result: { output?: unknown; status: "success" | "error"; errorMessage?: string; tokenUsage?: TokenUsage; cost?: number },
) {
  return runsRepo.completeSpan(spanId, result);
}

/** Runs a unit of work as a span: starts it, completes it with success/error based on outcome. */
export async function withSpan<T>(
  params: { traceId: string; parentSpanId?: string; type: SpanType; name: string; input?: unknown },
  fn: (spanId: string) => Promise<T>,
): Promise<T> {
  const span = await startSpan(params);
  try {
    const result = await fn(span.id);
    await completeSpan(span.id, { status: "success", output: result });
    return result;
  } catch (error) {
    await completeSpan(span.id, { status: "error", errorMessage: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function getTraceTree(traceId: string) {
  const spans = await runsRepo.listSpansForTrace(traceId);
  return { spans };
}

export async function getTraceForRun(runType: "agent" | "workflow", runId: string) {
  return runsRepo.getTraceForRun(runType, runId);
}
