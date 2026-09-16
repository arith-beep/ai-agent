import { streamText } from "ai";
import { agentsRepo, runsRepo } from "@ai-agent/storage";
import { resolveModel, estimateCost } from "@ai-agent/model-providers";
import { startTrace, completeTrace, startSpan, completeSpan, publishExecutionEvent } from "@ai-agent/observability";
import { getOrCreateThread, appendMessage, getRecentHistory, getWorkingMemory } from "@ai-agent/memory";
import type { TokenUsage } from "@ai-agent/shared-types";
import { buildSystemPrompt, normalizeInput } from "./system-prompt";
import { buildToolSet } from "./tool-set";

const MAX_TOOL_TURNS = 8;
const ZERO_USAGE: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

export interface ExecuteAgentRunParams {
  runId: string;
  orgId: string;
  agentId: string;
  input: unknown;
  threadId?: string;
}

export async function executeAgentRun(params: ExecuteAgentRunParams): Promise<void> {
  const { runId, orgId, agentId, input, threadId } = params;
  const startedAt = Date.now();

  const config = await agentsRepo.getAgentRuntimeConfig(orgId, agentId);
  if (!config) {
    await runsRepo.completeAgentRun(runId, { output: null, tokenUsage: ZERO_USAGE, estimatedCost: 0, status: "failed", errorMessage: `Agent ${agentId} not found.` });
    return;
  }
  if (config.agent.status !== "enabled") {
    await runsRepo.completeAgentRun(runId, {
      output: null,
      tokenUsage: ZERO_USAGE,
      estimatedCost: 0,
      status: "failed",
      errorMessage: `Agent "${config.agent.name}" is disabled.`,
    });
    return;
  }

  await runsRepo.setAgentRunStatus(runId, "running");
  const { traceId } = await startTrace(orgId, "agent", runId);
  const rootSpan = await startSpan({ traceId, type: "agent_run", name: config.agent.name, input });
  await publishExecutionEvent(runId, { type: "run-started", runId, at: new Date().toISOString() });

  try {
    const thread = await getOrCreateThread({ agentId, threadId });
    await runsRepo.linkRunThread(runId, thread.id);

    const userText = normalizeInput(input);
    await appendMessage(thread.id, "user", userText);

    const history = await getRecentHistory(thread.id, 20);
    const workingMemoryData = await getWorkingMemory(thread.id);
    const messages = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }));

    const model = await resolveModel(orgId, { provider: config.agent.modelProvider, model: config.agent.modelName });

    const toolSet = buildToolSet(config.tools, config.knowledgeBases.map((kb) => kb.id), {
      orgId,
      agentId,
      runId,
      traceId,
      rootSpanId: rootSpan.id,
      agentPermissions: config.permissions,
    });

    const modelSpan = await startSpan({
      traceId,
      parentSpanId: rootSpan.id,
      type: "model_call",
      name: `${config.agent.modelProvider}/${config.agent.modelName}`,
      input: messages,
    });

    const result = streamText({
      model,
      system: buildSystemPrompt(config.agent.systemPrompt, workingMemoryData),
      messages,
      tools: toolSet,
      maxSteps: MAX_TOOL_TURNS,
      temperature: config.agent.temperature,
      maxTokens: config.agent.maxTokens,
    });

    let finalText = "";
    for await (const delta of result.textStream) {
      finalText += delta;
      await publishExecutionEvent(runId, { type: "text-delta", runId, text: delta });
    }

    const usage = await result.usage;
    const tokenUsage: TokenUsage = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    };
    const cost = estimateCost(config.agent.modelProvider, config.agent.modelName, tokenUsage);
    await completeSpan(modelSpan.id, { status: "success", output: finalText, tokenUsage, cost });

    await appendMessage(thread.id, "assistant", finalText);

    const durationMs = Date.now() - startedAt;
    await completeSpan(rootSpan.id, { status: "success", output: finalText, tokenUsage, cost });
    await completeTrace(traceId, "success");
    await runsRepo.completeAgentRun(runId, { output: finalText, tokenUsage, estimatedCost: cost });
    await publishExecutionEvent(runId, { type: "run-completed", runId, output: finalText, tokenUsage, estimatedCost: cost, durationMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await completeSpan(rootSpan.id, { status: "error", errorMessage: message });
    await completeTrace(traceId, "error");
    await runsRepo.completeAgentRun(runId, { output: null, tokenUsage: ZERO_USAGE, estimatedCost: 0, status: "failed", errorMessage: message });
    await publishExecutionEvent(runId, { type: "run-failed", runId, errorMessage: message });
  }
}
