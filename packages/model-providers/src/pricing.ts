import type { ModelProvider, TokenUsage } from "@ai-agent/shared-types";

/**
 * Approximate USD price per 1M tokens. Used only for cost *estimation* shown
 * in the dashboard/trace viewer, not for billing. Update as provider pricing
 * changes; unknown models fall back to a conservative default so cost is
 * never silently reported as zero.
 */
const PRICING_PER_MILLION_TOKENS: Record<string, { prompt: number; completion: number }> = {
  "openai/gpt-4o": { prompt: 2.5, completion: 10 },
  "openai/gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
  "openai/o1": { prompt: 15, completion: 60 },
  "anthropic/claude-sonnet-5": { prompt: 3, completion: 15 },
  "anthropic/claude-opus-5": { prompt: 15, completion: 75 },
  "anthropic/claude-haiku-4-5": { prompt: 0.8, completion: 4 },
  "google/gemini-2.0-flash": { prompt: 0.1, completion: 0.4 },
  "google/gemini-2.0-pro": { prompt: 1.25, completion: 5 },
};

const DEFAULT_PRICING = { prompt: 3, completion: 15 };

export function estimateCost(provider: ModelProvider, model: string, usage: TokenUsage): number {
  const pricing = PRICING_PER_MILLION_TOKENS[`${provider}/${model}`] ?? DEFAULT_PRICING;
  const promptCost = (usage.promptTokens / 1_000_000) * pricing.prompt;
  const completionCost = (usage.completionTokens / 1_000_000) * pricing.completion;
  return Number((promptCost + completionCost).toFixed(6));
}
