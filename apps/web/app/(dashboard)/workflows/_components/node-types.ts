export const NODE_TYPE_LIST = [
  "trigger",
  "agent",
  "llm",
  "tool",
  "http_request",
  "db_query",
  "condition",
  "loop",
  "delay",
  "approval",
  "send_email",
  "send_message",
  "create_task",
  "webhook",
  "transform",
] as const;

export type NodeTypeId = (typeof NODE_TYPE_LIST)[number];

export const NODE_LABELS: Record<NodeTypeId, string> = {
  trigger: "Trigger",
  agent: "Agent",
  llm: "LLM",
  tool: "Tool",
  http_request: "HTTP Request",
  db_query: "Database Query",
  condition: "Condition",
  loop: "Loop",
  delay: "Delay",
  approval: "Approval",
  send_email: "Send Email",
  send_message: "Send Message",
  create_task: "Create Task",
  webhook: "Webhook",
  transform: "Transform",
};

export const NODE_COLORS: Record<NodeTypeId, string> = {
  trigger: "#22c55e",
  agent: "#6366f1",
  llm: "#8b5cf6",
  tool: "#0ea5e9",
  http_request: "#0ea5e9",
  db_query: "#0ea5e9",
  condition: "#eab308",
  loop: "#eab308",
  delay: "#94a3b8",
  approval: "#f97316",
  send_email: "#ec4899",
  send_message: "#ec4899",
  create_task: "#14b8a6",
  webhook: "#0ea5e9",
  transform: "#8b5cf6",
};

/** Default config (everything except id/type) seeded when a node is added to the canvas. */
export const NODE_TEMPLATES: Record<NodeTypeId, Record<string, unknown>> = {
  trigger: { config: { source: "manual" } },
  agent: { agentId: "", inputMapping: {} },
  llm: { model: { provider: "openai", model: "gpt-4o" }, prompt: "" },
  tool: { toolId: "", inputMapping: {} },
  http_request: { config: { url: "https://", method: "GET" } },
  db_query: { config: { connectionString: "", query: "select 1" } },
  condition: { expression: "true" },
  loop: { mode: "for_each", body: [], maxIterations: 100 },
  delay: { durationMs: 1000 },
  approval: { approverRole: "" },
  send_email: { config: { to: "", subject: "", body: "" } },
  send_message: { config: { toType: "agent", toId: "", kind: "notification", payload: {} } },
  create_task: { config: { title: "", description: "", ownerType: "human", ownerId: "" } },
  webhook: { config: { path: "https://" } },
  transform: { expression: "$" },
};

let counter = 0;
export function generateNodeId(type: NodeTypeId): string {
  counter += 1;
  return `${type}-${Date.now().toString(36)}-${counter}`;
}
