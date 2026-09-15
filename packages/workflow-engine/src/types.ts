import type { WorkflowNode } from "@ai-agent/shared-types";

export interface ExecutionContext {
  orgId: string;
  workflowRunId: string;
  traceId: string;
  /** Set when this workflow run is the compiled agent loop for a specific agent (see @ai-agent/agent-runtime). */
  agentId?: string;
}

export type StepResult = { type: "ok"; output: unknown } | { type: "suspend"; reason: string; resumeKey?: string };

export type NodeHandler = (node: WorkflowNode, input: unknown, state: Record<string, unknown>, ctx: ExecutionContext) => Promise<StepResult>;
