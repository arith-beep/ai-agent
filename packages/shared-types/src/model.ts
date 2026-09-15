import { z } from "zod";

export const modelProviders = ["openai", "anthropic", "google"] as const;
export type ModelProvider = (typeof modelProviders)[number];

export const modelProviderSchema = z.enum(modelProviders);

export const modelRefSchema = z.object({
  provider: modelProviderSchema,
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().max(200_000).default(4096),
});
export type ModelRef = z.infer<typeof modelRefSchema>;

export const tokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
