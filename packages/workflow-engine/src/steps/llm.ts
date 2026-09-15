import { generateText } from "ai";
import { resolveModel, estimateCost } from "@ai-agent/model-providers";
import type { ModelProvider } from "@ai-agent/shared-types";
import type { NodeHandler } from "../types";

/** Single-shot model call (no tool loop) — for a full agentic loop use an `agent` node instead. */
export const llmStepHandler: NodeHandler = async (node, input, _state, ctx) => {
  if (node.type !== "llm") throw new Error("llmStepHandler received a non-llm node");
  const modelConfig = node.model as { provider: ModelProvider; model: string };
  const promptTemplate = node.prompt as string;
  const prompt = promptTemplate.replace(/\{\{input\}\}/g, typeof input === "string" ? input : JSON.stringify(input));

  const model = await resolveModel(ctx.orgId, modelConfig);
  const result = await generateText({ model, prompt });

  return {
    type: "ok",
    output: {
      text: result.text,
      tokenUsage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
      estimatedCost: estimateCost(modelConfig.provider, modelConfig.model, {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      }),
    },
  };
};
