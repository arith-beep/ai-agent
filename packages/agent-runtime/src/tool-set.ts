import { tool, jsonSchema, type CoreTool } from "ai";
import { z } from "zod";
import { policyRepo, schema } from "@ai-agent/storage";
import { executeTool } from "@ai-agent/tools";
import { createKnowledgeQueryTool } from "@ai-agent/rag";
import { createTask } from "@ai-agent/tasks";
import { sendMessage } from "@ai-agent/message-bus";
import { startSpan, completeSpan, publishExecutionEvent } from "@ai-agent/observability";

type ToolRow = typeof schema.tools.$inferSelect;

export interface ToolSetContext {
  orgId: string;
  agentId: string;
  runId: string;
  traceId: string;
  rootSpanId: string;
}

function wrapAttachedTool(dbTool: ToolRow, ctx: ToolSetContext) {
  return tool({
    description: dbTool.description,
    parameters: jsonSchema(dbTool.inputSchema as Parameters<typeof jsonSchema>[0]),
    execute: async (input) => {
      const span = await startSpan({
        traceId: ctx.traceId,
        parentSpanId: ctx.rootSpanId,
        type: "tool_call",
        name: dbTool.name,
        input,
      });
      await publishExecutionEvent(ctx.runId, { type: "tool-call-start", runId: ctx.runId, spanId: span.id, toolName: dbTool.name, input });

      if (dbTool.requiresApproval) {
        const approval = await policyRepo.createApproval({
          orgId: ctx.orgId,
          actionType: `tool.${dbTool.name}`,
          requestedByType: "agent",
          requestedById: ctx.agentId,
          payload: { toolId: dbTool.id, input },
        });
        const output = {
          status: "pending_approval" as const,
          approvalId: approval.id,
          message: `The "${dbTool.name}" action requires human approval before it runs. It has been queued (approval id ${approval.id}); you'll be notified once it's resolved.`,
        };
        await completeSpan(span.id, { status: "success", output });
        await publishExecutionEvent(ctx.runId, { type: "approval-required", runId: ctx.runId, approvalId: approval.id, actionType: `tool.${dbTool.name}` });
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
