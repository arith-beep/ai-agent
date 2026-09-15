import { sendMessage } from "@ai-agent/message-bus";
import { createTask } from "@ai-agent/tasks";
import type { NodeHandler } from "../types";

export const sendMessageStepHandler: NodeHandler = async (node, input, _state, ctx) => {
  if (node.type !== "send_message") throw new Error("sendMessageStepHandler received a non-send_message node");
  const config = node.config as { toType: "human" | "agent"; toId: string; kind: string; payload: Record<string, unknown> };
  const fromId = (node.agentId as string | undefined) ?? ctx.agentId;
  if (!fromId) throw new Error("send_message node requires an agentId (sender) in this run's context.");

  const message = await sendMessage(ctx.orgId, {
    from: { type: "agent", id: fromId },
    to: { type: config.toType, id: config.toId },
    kind: config.kind as "task" | "query" | "notification" | "event" | "response",
    payload: { ...config.payload, sourceInput: input },
    priority: "normal",
  });
  return { type: "ok", output: { messageId: message.id } };
};

export const createTaskStepHandler: NodeHandler = async (node, input, _state, ctx) => {
  if (node.type !== "create_task") throw new Error("createTaskStepHandler received a non-create_task node");
  const config = node.config as { title: string; description?: string; ownerType: "human" | "agent"; ownerId: string };

  const agentCreatorId = (node.agentId as string | undefined) ?? ctx.agentId;
  const createdByType: "human" | "agent" = agentCreatorId ? "agent" : "human";
  const createdById = agentCreatorId ?? (ctx.triggeredByType === "manual" ? ctx.triggeredById : undefined);
  if (!createdById) {
    throw new Error(
      "create_task node has no agent or human to attribute the task to — set an agentId on the node, or trigger this workflow manually.",
    );
  }

  const task = await createTask({
    orgId: ctx.orgId,
    title: config.title,
    description: config.description,
    ownerType: config.ownerType,
    ownerId: config.ownerId,
    createdByType,
    createdById,
    priority: "normal",
    dependsOnTaskIds: [],
  });
  return { type: "ok", output: { taskId: task.id, sourceInput: input } };
};
