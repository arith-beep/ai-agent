import { policyRepo } from "@ai-agent/storage";
import { getQueues } from "@ai-agent/queue";
import type { NodeHandler } from "../types";

export const delayStepHandler: NodeHandler = async (node, input, _state, ctx) => {
  if (node.type !== "delay") throw new Error("delayStepHandler received a non-delay node");
  const durationMs = (node.durationMs as number | undefined) ?? (node.until ? new Date(node.until as string).getTime() - Date.now() : 0);
  if (durationMs <= 0) return { type: "ok", output: input };

  const queues = getQueues();
  await queues.workflowResume.add("resume", { workflowRunId: ctx.workflowRunId, resumePayload: input }, { delay: durationMs });
  return { type: "suspend", reason: "delay", resumeKey: `delay:${ctx.workflowRunId}` };
};

export const approvalStepHandler: NodeHandler = async (node, input, _state, ctx) => {
  if (node.type !== "approval") throw new Error("approvalStepHandler received a non-approval node");
  const requestedByType = ctx.agentId ? "agent" : "human";
  const requestedById = ctx.agentId ?? (ctx.triggeredByType === "manual" ? ctx.triggeredById : undefined);
  if (!requestedById) {
    throw new Error("approval node has no agent or human to attribute the request to — trigger this workflow manually, or run it as part of an agent.");
  }
  const approverRole = (node.approverRole as string | undefined) || undefined;
  const approval = await policyRepo.createApproval({
    orgId: ctx.orgId,
    actionType: "workflow.approval",
    requestedByType,
    requestedById,
    workflowRunId: ctx.workflowRunId,
    payload: { input },
    approverRole,
  });
  return { type: "suspend", reason: "human_approval_required", resumeKey: approval.id };
};

/** condition nodes pass their input through unchanged — branching is decided by evaluating each outgoing edge's own condition (see engine.ts). */
export const conditionStepHandler: NodeHandler = async (_node, input) => ({ type: "ok", output: input });
