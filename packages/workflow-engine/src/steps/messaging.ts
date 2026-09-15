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
  const createdById = (node.agentId as string | undefined) ?? ctx.agentId;
  if (!createdById) throw new Error("create_task node requires an agentId (creator) in this run's context.");

  const task = await createTask({
    orgId: ctx.orgId,
    title: config.title,
    description: config.description,
    ownerType: config.ownerType,
    ownerId: config.ownerId,
    createdByType: "agent",
    createdById,
    priority: "normal",
    dependsOnTaskIds: [],
  });
  return { type: "ok", output: { taskId: task.id, sourceInput: input } };
};
