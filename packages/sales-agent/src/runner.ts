import { streamText } from "ai";
import { salesRepo } from "@ai-agent/storage";
import { resolveModel } from "@ai-agent/model-providers";
import { buildSalesSystemPrompt } from "./system-prompt";
import { buildSalesToolSet, type RunDebug } from "./tool-set";

const MAX_TOOL_STEPS = 6;
const FALLBACK_MESSAGE = "Sorry, something went wrong on my end. A team member has been notified.";

export interface RunConversationTurnParams {
  orgId: string;
  agentId: string;
  conversationId: string;
  userMessage: string;
}

export interface ConversationTurnDebug extends RunDebug {
  latencyMs: number;
  model: string;
  error?: string;
  lead: Awaited<ReturnType<typeof salesRepo.getLeadForConversation>>;
}

export interface RunConversationTurnResult {
  assistantText: string;
  debug: ConversationTurnDebug;
}

/**
 * Executes one turn of a sales conversation: persists the user message,
 * resolves the agent's model/tools/knowledge, runs the tool-calling loop,
 * and persists the assistant's reply with a full debug trace (retrieved
 * knowledge, tool calls, latency, current lead/qualification state). Runs
 * synchronously in the calling request — a chat turn is fast enough that it
 * doesn't need the BullMQ background-job treatment the internal platform's
 * longer-running agent/workflow runs use.
 */
export async function runConversationTurn(params: RunConversationTurnParams): Promise<RunConversationTurnResult> {
  const startedAt = Date.now();
  const agent = await salesRepo.getAgentById(params.orgId, params.agentId);
  if (!agent) throw new Error(`Sales agent ${params.agentId} not found.`);

  await salesRepo.appendMessage({ conversationId: params.conversationId, role: "user", content: params.userMessage });

  const debug: RunDebug = { retrievedChunks: [], toolCalls: [] };
  const modelLabel = `${agent.modelProvider}/${agent.modelName}`;

  async function finish(assistantText: string, error?: string): Promise<RunConversationTurnResult> {
    const lead = await salesRepo.getLeadForConversation(params.orgId, params.conversationId);
    const fullDebug: ConversationTurnDebug = { ...debug, latencyMs: Date.now() - startedAt, model: modelLabel, error, lead };
    await salesRepo.appendMessage({
      conversationId: params.conversationId,
      role: "assistant",
      content: assistantText,
      debug: fullDebug as unknown as Record<string, unknown>,
    });
    return { assistantText, debug: fullDebug };
  }

  try {
    const history = await salesRepo.listMessages(params.conversationId);
    const messages = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const attachedTools = await salesRepo.listEnabledAgentTools(params.agentId);
    const model = await resolveModel(params.orgId, { provider: agent.modelProvider, model: agent.modelName });
    const toolSet = buildSalesToolSet(
      attachedTools,
      { orgId: params.orgId, agentId: params.agentId, conversationId: params.conversationId },
      debug,
    );

    let streamError: unknown;
    const result = streamText({
      model,
      system: buildSalesSystemPrompt(agent),
      messages,
      tools: toolSet,
      maxSteps: MAX_TOOL_STEPS,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      // streamText() does not throw on the request/stream failing — the AI SDK only
      // surfaces that failure through this callback, leaving textStream to complete
      // silently with zero deltas. Without capturing it here, a real provider error
      // (bad key, rate limit, etc.) would look identical to a legitimately empty
      // response and get papered over by the placeholder text below.
      onError: ({ error }) => {
        streamError = error;
      },
    });

    let text = "";
    for await (const delta of result.textStream) text += delta;

    if (streamError) throw streamError;
    if (!text.trim()) text = "I've made a note of that — is there anything else I can help with?";

    return await finish(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return await finish(FALLBACK_MESSAGE, message);
  }
}
