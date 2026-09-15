import { toolsRepo, policyRepo } from "@ai-agent/storage";
import { executeTool } from "@ai-agent/tools";
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

  const requiresApproval = Boolean(node.requiresApproval) || tool.requiresApproval;
  if (requiresApproval) {
    const approval = await policyRepo.createApproval({
      orgId: ctx.orgId,
      actionType: `tool.${tool.name}`,
      requestedByType: "agent",
      requestedById: (node.agentId as string | undefined) ?? ctx.agentId ?? "unknown",
      workflowRunId: ctx.workflowRunId,
      payload: { toolId, input },
    });
    return { type: "suspend", reason: "tool_approval_required", resumeKey: approval.id };
  }

  const result = await executeTool({ tool, orgId: ctx.orgId, agentId: (node.agentId as string | undefined) ?? ctx.agentId, input });
  if (result.status === "error") throw new Error(result.errorMessage ?? "Tool execution failed");
  return { type: "ok", output: result.output };
};
