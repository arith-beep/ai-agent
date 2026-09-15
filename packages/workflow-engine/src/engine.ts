import { workflowsRepo } from "@ai-agent/storage";
import { startTrace, completeTrace, startSpan, completeSpan, getTraceForRun } from "@ai-agent/observability";
import type { WorkflowDefinition, WorkflowNode, WorkflowSnapshot } from "@ai-agent/shared-types";
import type { ExecutionContext, NodeHandler, StepResult } from "./types";
import { evaluateCondition } from "./steps/expression";
import { defaultHandlers } from "./steps/index";

export interface StartWorkflowRunOptions {
  orgId: string;
  workflowId: string;
  definition: WorkflowDefinition;
  input: unknown;
  triggeredByType: "manual" | "schedule" | "webhook" | "event" | "agent";
  triggeredById?: string;
  /** Set for the ephemeral agent-loop workflow (see @ai-agent/agent-runtime) so tool/send_message/create_task nodes know who they're acting on behalf of. */
  agentId?: string;
  /** Extra/overriding node handlers, e.g. an `agent` node handler the caller wires to @ai-agent/agent-runtime (workflow-engine cannot depend on it directly — see docs/architecture/07 boundary rule). */
  extraHandlers?: Partial<Record<string, NodeHandler>>;
}

const MAX_LOOP_ITERATIONS_HARD_CAP = 1000;

function findNode(definition: WorkflowDefinition, nodeId: string): WorkflowNode {
  const node = definition.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Node "${nodeId}" not found in workflow definition`);
  return node;
}

async function pickNextEdge(definition: WorkflowDefinition, fromNodeId: string, output: unknown, state: Record<string, unknown>) {
  const edges = definition.edges.filter((e) => e.from === fromNodeId);
  const conditional = edges.filter((e) => e.condition);
  const unconditional = edges.filter((e) => !e.condition);
  for (const edge of conditional) {
    if (edge.condition && (await evaluateCondition(edge.condition, output, state))) return edge;
  }
  // NOTE: true parallel fan-out (multiple unconditional edges dispatched concurrently, per
  // docs/architecture/06) is a Milestone 2 capability; for now the first unconditional edge
  // is taken as the "next" step, so a fan-out workflow will run sequentially rather than in
  // parallel until that lands.
  return unconditional[0];
}

async function runSingleNode(
  node: WorkflowNode,
  input: unknown,
  state: Record<string, unknown>,
  ctx: ExecutionContext,
  handlers: Record<string, NodeHandler>,
  parentSpanId?: string,
): Promise<StepResult> {
  if (node.type === "loop") {
    return runLoopNode(node, input, state, ctx, handlers, parentSpanId);
  }

  const handler = handlers[node.type];
  if (!handler) throw new Error(`No handler registered for node type "${node.type}"`);

  const span = await startSpan({ traceId: ctx.traceId, parentSpanId, type: "workflow_step", name: `${node.type}:${node.id}`, input });
  await workflowsRepo.recordStepRun({ workflowRunId: ctx.workflowRunId, stepId: node.id, stepType: node.type, status: "running", input });

  try {
    const result = await handler(node, input, state, ctx);
    if (result.type === "suspend") {
      await completeSpan(span.id, { status: "success", output: { suspended: true, reason: result.reason } });
      await workflowsRepo.recordStepRun({ workflowRunId: ctx.workflowRunId, stepId: node.id, stepType: node.type, status: "suspended", input });
    } else {
      await completeSpan(span.id, { status: "success", output: result.output });
      await workflowsRepo.recordStepRun({ workflowRunId: ctx.workflowRunId, stepId: node.id, stepType: node.type, status: "completed", input, output: result.output });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await completeSpan(span.id, { status: "error", errorMessage: message });
    await workflowsRepo.recordStepRun({ workflowRunId: ctx.workflowRunId, stepId: node.id, stepType: node.type, status: "failed", input, errorMessage: message });
    throw error;
  }
}

async function runLoopNode(
  node: WorkflowNode,
  input: unknown,
  state: Record<string, unknown>,
  ctx: ExecutionContext,
  handlers: Record<string, NodeHandler>,
  parentSpanId?: string,
): Promise<StepResult> {
  const body = node.body as WorkflowNode[];
  const mode = node.mode as "for_each" | "while";
  const maxIterations = Math.min((node.maxIterations as number | undefined) ?? 100, MAX_LOOP_ITERATIONS_HARD_CAP);
  const items = mode === "for_each" ? (input as unknown[]) : [];

  const span = await startSpan({ traceId: ctx.traceId, parentSpanId, type: "workflow_step", name: `loop:${node.id}`, input });
  const results: unknown[] = [];

  try {
    let iteration = 0;
    while (iteration < maxIterations) {
      if (mode === "for_each") {
        if (iteration >= items.length) break;
      } else if (mode === "while") {
        const condition = node.condition as string;
        if (!(await evaluateCondition(condition, { results, iteration }, state))) break;
      }

      let stepInput: unknown = mode === "for_each" ? items[iteration] : { iteration, results };
      for (const bodyNode of body) {
        const result = await runSingleNode(bodyNode, stepInput, state, ctx, handlers, span.id);
        if (result.type === "suspend") {
          throw new Error("Suspending inside a loop body is not yet supported. Move approval/delay steps outside the loop.");
        }
        stepInput = result.output;
      }
      results.push(stepInput);
      iteration += 1;
    }

    await completeSpan(span.id, { status: "success", output: { results } });
    await workflowsRepo.recordStepRun({ workflowRunId: ctx.workflowRunId, stepId: node.id, stepType: "loop", status: "completed", input, output: { results } });
    return { type: "ok", output: results };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await completeSpan(span.id, { status: "error", errorMessage: message });
    await workflowsRepo.recordStepRun({ workflowRunId: ctx.workflowRunId, stepId: node.id, stepType: "loop", status: "failed", input, errorMessage: message });
    throw error;
  }
}

async function runGraph(
  definition: WorkflowDefinition,
  startNodeId: string,
  initialInput: unknown,
  initialState: Record<string, unknown>,
  ctx: ExecutionContext,
  handlers: Record<string, NodeHandler>,
): Promise<void> {
  let currentNodeId: string | undefined = startNodeId;
  let currentInput = initialInput;
  const state = initialState;

  while (currentNodeId) {
    const node = findNode(definition, currentNodeId);

    let result: StepResult;
    try {
      result = await runSingleNode(node, currentInput, state, ctx, handlers);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await workflowsRepo.setWorkflowRunStatus(ctx.workflowRunId, "failed", { errorMessage: message });
      await completeTrace(ctx.traceId, "error");
      throw error;
    }

    if (result.type === "suspend") {
      const snapshot: WorkflowSnapshot = { currentNodeId: node.id, state, pendingResumeKey: result.resumeKey };
      await workflowsRepo.setWorkflowRunStatus(ctx.workflowRunId, "suspended", { snapshot });
      return;
    }

    currentInput = result.output;
    const nextEdge = await pickNextEdge(definition, node.id, currentInput, state);
    if (!nextEdge) {
      await workflowsRepo.setWorkflowRunStatus(ctx.workflowRunId, "completed", { output: currentInput });
      await completeTrace(ctx.traceId, "success");
      return;
    }
    currentNodeId = nextEdge.to;
  }
}

export async function startWorkflowRun(opts: StartWorkflowRunOptions): Promise<{ runId: string }> {
  const run = await workflowsRepo.createWorkflowRun({
    workflowId: opts.workflowId,
    input: opts.input,
    triggeredByType: opts.triggeredByType,
    triggeredById: opts.triggeredById,
  });
  const { traceId } = await startTrace(opts.orgId, "workflow", run.id);
  await workflowsRepo.setWorkflowRunStatus(run.id, "running");

  const ctx: ExecutionContext = { orgId: opts.orgId, workflowRunId: run.id, traceId, agentId: opts.agentId };
  const handlers = { ...defaultHandlers, ...(opts.extraHandlers ?? {}) } as Record<string, NodeHandler>;

  await runGraph(opts.definition, opts.definition.entryNodeId, opts.input, {}, ctx, handlers);
  return { runId: run.id };
}

export async function resumeWorkflowRun(
  workflowRunId: string,
  resumePayload: unknown,
  opts?: { extraHandlers?: Partial<Record<string, NodeHandler>> },
): Promise<void> {
  const run = await workflowsRepo.getWorkflowRun(workflowRunId);
  if (!run) throw new Error(`Workflow run ${workflowRunId} not found`);
  if (run.status !== "suspended") return;

  const workflow = await workflowsRepo.getWorkflow(run.workflowId);
  if (!workflow) throw new Error(`Workflow ${run.workflowId} not found`);
  const definition = workflow.definition as unknown as WorkflowDefinition;
  const snapshot = run.snapshot as unknown as WorkflowSnapshot;
  const trace = await getTraceForRun("workflow", run.id);
  if (!trace) throw new Error(`Trace for workflow run ${run.id} not found`);

  await workflowsRepo.setWorkflowRunStatus(run.id, "running", { snapshot: null });
  const ctx: ExecutionContext = { orgId: workflow.orgId, workflowRunId: run.id, traceId: trace.id };
  const handlers = { ...defaultHandlers, ...(opts?.extraHandlers ?? {}) } as Record<string, NodeHandler>;

  const nextEdge = await pickNextEdge(definition, snapshot.currentNodeId, resumePayload, snapshot.state);
  if (!nextEdge) {
    await workflowsRepo.setWorkflowRunStatus(run.id, "completed", { output: resumePayload });
    await completeTrace(ctx.traceId, "success");
    return;
  }
  await runGraph(definition, nextEdge.to, resumePayload, snapshot.state, ctx, handlers);
}
