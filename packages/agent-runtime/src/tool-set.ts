import { tool, jsonSchema, type CoreTool } from "ai";
import { z } from "zod";
import { policyRepo, schema } from "@ai-agent/storage";
import { resolveApprovalRequirement, type AgentPermissionLike } from "@ai-agent/auth";
import { executeTool } from "@ai-agent/tools";
import { createKnowledgeQueryTool } from "@ai-agent/rag";
import { createTask, transitionTask } from "@ai-agent/tasks";
import { sendMessage } from "@ai-agent/message-bus";
import { startSpan, completeSpan, publishExecutionEvent } from "@ai-agent/observability";

type ToolRow = typeof schema.tools.$inferSelect;

export interface ToolSetContext {
  orgId: string;
  agentId: string;
  runId: string;
  traceId: string;
  rootSpanId: string;
  agentPermissions: AgentPermissionLike[];
}

/** Creates a pending approval and returns the structured "queued" tool result every approval gate shares. */
async function requestApproval(
  ctx: ToolSetContext,
  actionType: string,
  approverRole: string | undefined,
  policyId: string | undefined,
  payload: Record<string, unknown>,
) {
  const approval = await policyRepo.createApproval({
    orgId: ctx.orgId,
    actionType,
    requestedByType: "agent",
    requestedById: ctx.agentId,
    payload,
    approverRole,
    policyId,
  });
  await publishExecutionEvent(ctx.runId, { type: "approval-required", runId: ctx.runId, approvalId: approval.id, actionType });
  return {
    status: "pending_approval" as const,
    approvalId: approval.id,
    message: `"${actionType}" requires human approval${approverRole ? ` from a ${approverRole}` : ""} before it runs. It has been queued (approval id ${approval.id}); you'll be notified once it's resolved.`,
  };
}

function wrapAttachedTool(dbTool: ToolRow, ctx: ToolSetContext) {
  return tool({
    description: dbTool.description,
    parameters: jsonSchema(dbTool.inputSchema as Parameters<typeof jsonSchema>[0]),
    execute: async (input) => {
      const actionType = `tool.${dbTool.name}`;
      const span = await startSpan({
        traceId: ctx.traceId,
        parentSpanId: ctx.rootSpanId,
        type: "tool_call",
        name: dbTool.name,
        input,
      });
      await publishExecutionEvent(ctx.runId, { type: "tool-call-start", runId: ctx.runId, spanId: span.id, toolName: dbTool.name, input });

      const requirement = await resolveApprovalRequirement(ctx.orgId, actionType, ctx.agentPermissions);
      if (dbTool.requiresApproval || requirement.requiresApproval) {
        const output = await requestApproval(ctx, actionType, requirement.approverRole, requirement.policyId, { toolId: dbTool.id, input });
        await completeSpan(span.id, { status: "success", output });
        await publishExecutionEvent(ctx.runId, { type: "tool-call-result", runId: ctx.runId, spanId: span.id, toolName: dbTool.name, output, status: "success" });
        return output;
      }

      const result = await executeTool({ tool: dbTool, orgId: ctx.orgId, agentId: ctx.agentId, runId: ctx.runId, spanId: span.id, input });
      await completeSpan(span.id, { status: result.status, output: result.output, errorMessage: result.errorMessage });
      await publishExecutionEvent(ctx.runId, {
        type: "tool-call-result",
        runId: ctx.runId,
        spanId: span.id,
        toolName: dbTool.name,
        output: result.status === "success" ? result.output : { error: result.errorMessage },
        status: result.status,
      });
      if (result.status === "error") return { error: result.errorMessage };
      return result.output;
    },
  });
}

function buildCreateTaskTool(ctx: ToolSetContext) {
  return tool({
    description: "Create a task, either for yourself/another AI agent to work on, or for a human to review and complete.",
    parameters: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      ownerType: z.enum(["human", "agent"]),
      ownerId: z.string().uuid().describe("The id of the human user or agent who owns this task"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      dueDate: z.string().datetime().optional(),
    }),
    execute: async (input) => {
      const span = await startSpan({ traceId: ctx.traceId, parentSpanId: ctx.rootSpanId, type: "tool_call", name: "create_task", input });
      const task = await createTask({
        orgId: ctx.orgId,
        title: input.title,
        description: input.description,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        createdByType: "agent",
        createdById: ctx.agentId,
        priority: input.priority,
        dueDate: input.dueDate,
        dependsOnTaskIds: [],
      });
      await completeSpan(span.id, { status: "success", output: { taskId: task.id } });
      return { taskId: task.id, status: task.status };
    },
  });
}

const TASK_STATUS_VALUES = ["open", "in_progress", "blocked", "in_review", "done", "cancelled"] as const;

function buildUpdateTaskStatusTool(ctx: ToolSetContext) {
  return tool({
    description:
      "Move a task you own to a new status (e.g. mark it in_progress or done). Some transitions may require human approval depending on this org's policies.",
    parameters: z.object({
      taskId: z.string().uuid(),
      status: z.enum(TASK_STATUS_VALUES),
      note: z.string().optional(),
    }),
    execute: async (input) => {
      const actionType = `task.status.${input.status}`;
      const span = await startSpan({ traceId: ctx.traceId, parentSpanId: ctx.rootSpanId, type: "tool_call", name: "update_task_status", input });

      const requirement = await resolveApprovalRequirement(ctx.orgId, actionType, ctx.agentPermissions);
      if (requirement.requiresApproval) {
        const output = await requestApproval(ctx, actionType, requirement.approverRole, requirement.policyId, {
          taskId: input.taskId,
          status: input.status,
          note: input.note,
        });
        await completeSpan(span.id, { status: "success", output });
        return output;
      }

      let task;
      try {
        task = await transitionTask(ctx.orgId, input.taskId, input.status, { type: "agent", id: ctx.agentId });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await completeSpan(span.id, { status: "error", output: { error: message }, errorMessage: message });
        return { error: message };
      }
      if (!task) {
        const output = { error: `Task ${input.taskId} not found.` };
        await completeSpan(span.id, { status: "error", output, errorMessage: output.error });
        return output;
      }
      await completeSpan(span.id, { status: "success", output: { taskId: task.id, status: task.status } });
      return { taskId: task.id, status: task.status };
    },
  });
}

function buildSendAgentMessageTool(ctx: ToolSetContext) {
  return tool({
    description: "Send a message to another AI agent (must already be connected to this agent) or notify a human.",
    parameters: z.object({
      toType: z.enum(["human", "agent"]),
      toId: z.string().uuid(),
      kind: z.enum(["task", "query", "notification", "event", "response"]),
      payload: z.record(z.string(), z.unknown()),
      correlationId: z.string().uuid().optional(),
    }),
    execute: async (input) => {
      const span = await startSpan({ traceId: ctx.traceId, parentSpanId: ctx.rootSpanId, type: "agent_message", name: `send_message:${input.kind}`, input });
      const message = await sendMessage(ctx.orgId, {
        from: { type: "agent", id: ctx.agentId },
        to: { type: input.toType, id: input.toId },
        kind: input.kind,
        payload: input.payload,
        priority: "normal",
        correlationId: input.correlationId,
      });
      await completeSpan(span.id, { status: "success", output: { messageId: message.id } });
      await publishExecutionEvent(ctx.runId, { type: "agent-message", runId: ctx.runId, direction: "outgoing", withAgentId: input.toId, kind: input.kind });
      return { messageId: message.id, status: message.status };
    },
  });
}

export function buildToolSet(attachedTools: ToolRow[], knowledgeBaseIds: string[], ctx: ToolSetContext): Record<string, CoreTool> {
  const toolSet: Record<string, CoreTool> = {
    create_task: buildCreateTaskTool(ctx),
    update_task_status: buildUpdateTaskStatusTool(ctx),
    send_agent_message: buildSendAgentMessageTool(ctx),
  };

  for (const dbTool of attachedTools) {
    const key = dbTool.builtinKey ?? dbTool.id;
    toolSet[key] = wrapAttachedTool(dbTool, ctx);
  }

  if (knowledgeBaseIds.length > 0) {
    toolSet.query_knowledge_base = createKnowledgeQueryTool(ctx.orgId, knowledgeBaseIds);
  }

  return toolSet;
}
