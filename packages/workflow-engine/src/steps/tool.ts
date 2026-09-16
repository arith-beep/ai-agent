import { toolsRepo, policyRepo } from "@ai-agent/storage";
import { executeTool } from "@ai-agent/tools";
import { resolveApprovalRequirement } from "@ai-agent/auth";
import type { NodeHandler } from "../types";

/**
 * Executes a `tool` node. Approval gating reuses the same suspend mechanism
 * as every other suspend point in the engine (docs/architecture/06):
 * ephemeral nodes built by the Agent Runtime can set `requiresApproval` and
 * `agentId` directly on the node (see @ai-agent/agent-runtime), since those
 * are runtime-only fields not part of the persisted WorkflowDefinition.
 */
export const toolStepHandler: NodeHandler = async (node, input, _state, ctx) => {
  if (node.type !== "tool") throw new Error("toolStepHandler received a non-tool node");
  const toolId = node.toolId as string;
  const tool = await toolsRepo.getToolById(ctx.orgId, toolId);
  if (!tool) throw new Error(`Tool ${toolId} not found`);

  const nodeAgentId = node.agentId as string | undefined;
  const requestedByType = nodeAgentId || ctx.agentId ? "agent" : "human";
  const requestedById = nodeAgentId ?? ctx.agentId ?? (ctx.triggeredByType === "manual" ? ctx.triggeredById : undefined);

  const actionType = `tool.${tool.name}`;
  const requirement = await resolveApprovalRequirement(ctx.orgId, actionType);
  const requiresApproval = Boolean(node.requiresApproval) || tool.requiresApproval || requirement.requiresApproval;

  if (requiresApproval) {
    if (!requestedById) {
      throw new Error(`tool node "${tool.name}" requires approval but has no agent or human to attribute the request to.`);
    }
    const approval = await policyRepo.createApproval({
      orgId: ctx.orgId,
      actionType,
      requestedByType,
      requestedById,
      workflowRunId: ctx.workflowRunId,
      payload: { toolId, input },
      approverRole: requirement.approverRole,
      policyId: requirement.policyId,
    });
    return { type: "suspend", reason: "tool_approval_required", resumeKey: approval.id };
  }

  const result = await executeTool({ tool, orgId: ctx.orgId, agentId: nodeAgentId ?? ctx.agentId, input });
  if (result.status === "error") throw new Error(result.errorMessage ?? "Tool execution failed");
  return { type: "ok", output: result.output };
};
