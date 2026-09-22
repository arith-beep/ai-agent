import type { LanguageModel } from "ai";
import type { ModelProvider } from "@ai-agent/shared-types";
import { managerRepo } from "@ai-agent/storage";
import { resolveModel } from "./router";

export type ManagerModelResolution =
  | { status: "ready"; model: LanguageModel; provider: ModelProvider; modelName: string }
  | { status: "not_configured" }
  | { status: "credential_missing"; provider: ModelProvider; modelName: string };

/**
 * Resolves the Manager Agent's model for an org — deliberately NOT by
 * picking whichever provider happens to have a credential configured.
 * Requires an explicit `manager_agent_config` row (set via the dashboard).
 * Distinguishes "never configured" from "configured, but the credential for
 * that provider is missing/removed" so the UI can show the right message
 * instead of a generic failure.
 */
export async function resolveManagerModel(orgId: string): Promise<ManagerModelResolution> {
  const config = await managerRepo.getManagerAgentConfig(orgId);
  if (!config) return { status: "not_configured" };

  try {
    const model = await resolveModel(orgId, { provider: config.modelProvider, model: config.modelName });
    return { status: "ready", model, provider: config.modelProvider, modelName: config.modelName };
  } catch (error) {
    // resolveModel's only throw path is a missing API key (see getApiKey in router.ts) — anything else is unexpected and should propagate.
    if (error instanceof Error && error.message.startsWith("No API key configured")) {
      return { status: "credential_missing", provider: config.modelProvider, modelName: config.modelName };
    }
    throw error;
  }
}
