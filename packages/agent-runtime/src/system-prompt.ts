export function buildSystemPrompt(basePrompt: string, workingMemory: Record<string, unknown>): string {
  const hasWorkingMemory = Object.keys(workingMemory).length > 0;
  if (!hasWorkingMemory) return basePrompt;

  return `${basePrompt}

---
Working memory (what you have previously recorded about this conversation/user — treat as ground truth unless contradicted by the latest message):
${JSON.stringify(workingMemory, null, 2)}`;
}

/** Renders a run's input into a single user-facing message string for the model. */
export function normalizeInput(input: unknown): string {
  if (typeof input === "string") return input;
  if (input && typeof input === "object" && "sourceKind" in input && (input as { sourceKind: unknown }).sourceKind === "agent_message") {
    const msg = input as unknown as { kind: string; from: { type: string; id: string }; payload: Record<string, unknown> };
    return `You received a "${msg.kind}" message from ${msg.from.type} ${msg.from.id}:\n${JSON.stringify(msg.payload, null, 2)}`;
  }
  return JSON.stringify(input);
}
