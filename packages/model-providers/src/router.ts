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
      //
      // structuredOutputs: false is required, not optional, here. The AI
      // SDK's @ai-sdk/openai decides whether a model supports OpenAI's
      // "strict" structured tool-calling mode with
      // `modelId.startsWith("o") || modelId.startsWith("gpt-5")` — meant to
      // detect o1/o3/gpt-5 reasoning models. OpenRouter's slug format
      // prefixes every model with its provider (e.g. "openai/gpt-4o-mini"),
      // which also starts with "o" and false-positives that check. That
      // silently turned on `strict: true` for every tool call, which
      // requires every property to be listed in JSON Schema's `required`
      // (with nullable types standing in for real optionality) — our tools
      // use plain Zod `.optional()` fields instead, so OpenAI's own strict
      // validator rejected the request with a 400 ("'required' ... must
      // include every key in properties. Missing 'repId'"), confirmed
      // against the captured request/response in
      // `_manager_agent_diag_log`. Explicitly forcing structuredOutputs to
      // false overrides that false-positive without touching the modelId
      // OpenRouter needs for routing.
      return createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL, compatibility: "compatible" })(ref.model, { structuredOutputs: false });
    default: {
      const exhaustive: never = ref.provider;
      throw new Error(`Unsupported model provider: ${exhaustive}`);
    }
  }
}
