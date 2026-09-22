import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { ModelProvider } from "@ai-agent/shared-types";
import { credentialsRepo } from "@ai-agent/storage";

const ENV_VAR_BY_PROVIDER: Record<ModelProvider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

async function getApiKey(orgId: string, provider: ModelProvider): Promise<string> {
  const fromDb = await credentialsRepo.getDecryptedApiKey(orgId, provider);
  if (fromDb) return fromDb;

  const envVar = ENV_VAR_BY_PROVIDER[provider];
  const fromEnv = process.env[envVar];
  if (fromEnv) return fromEnv;

  throw new Error(
    `No API key configured for provider "${provider}". Add one under Settings > Models for this organization, or set ${envVar} for local development.`,
  );
}

/**
 * Resolves a `"provider/model"`-style reference to a Vercel AI SDK
 * LanguageModel, using the organization's own encrypted credential when
 * configured. This is the only place in the platform that talks to a
 * specific provider SDK — everything else (Agent Runtime, Workflow Engine)
 * calls through here.
 */
export async function resolveModel(orgId: string, ref: { provider: ModelProvider; model: string }): Promise<LanguageModel> {
  const apiKey = await getApiKey(orgId, ref.provider);

  switch (ref.provider) {
    case "openai":
      return createOpenAI({ apiKey })(ref.model);
    case "anthropic":
      return createAnthropic({ apiKey })(ref.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(ref.model);
    case "openrouter":
      // OpenRouter exposes an OpenAI-compatible chat completions endpoint that
      // proxies to many upstream models; "compatible" mode relaxes the strict
      // OpenAI-only response validation the AI SDK otherwise applies.
      return createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL, compatibility: "compatible" })(ref.model);
    default: {
      const exhaustive: never = ref.provider;
      throw new Error(`Unsupported model provider: ${exhaustive}`);
    }
  }
}
