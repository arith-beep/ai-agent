"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { managerRepo } from "@ai-agent/storage";
import { modelProviderSchema } from "@ai-agent/shared-types";
import { generateMorningBrief, prepareCoachingSession } from "@ai-agent/manager-agent";
import { requireManagerAccess } from "@/lib/manager-access";

/** Explicit, deliberate model choice for the org's Manager Agent — never inferred from whichever credential happens to exist. */
export async function setManagerAgentConfigAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const parsedProvider = modelProviderSchema.safeParse(formData.get("modelProvider"));
  const modelName = String(formData.get("modelName") ?? "").trim();
  if (!parsedProvider.success || !modelName) {
    redirect("/manager?error=" + encodeURIComponent("Choose a provider and model name."));
  }
  await managerRepo.setManagerAgentConfig({ orgId: ctx.orgId, modelProvider: parsedProvider.data, modelName, updatedByUserId: ctx.userId });
  revalidatePath("/manager");
}

export type GenerateActionResult = { ok: true } | { ok: false; error: string };

function describeFailure(result: { status: string; provider?: string; modelName?: string; message?: string }): string | null {
  if (result.status === "ready") return null;
  if (result.status === "not_configured") return "Set up a Manager Agent model below before generating a brief.";
  if (result.status === "credential_missing") return `The configured provider (${result.provider}/${result.modelName}) has no API key — add one under Settings > Models.`;
  return `Generation failed: ${result.message ?? "unknown error"}`;
}

/**
 * Returns a result object instead of relying on redirect()/revalidatePath alone to
 * signal completion — the same class of bug fixed in auth-actions.ts (a Server Action
 * whose only signal to the browser was an implicit redirect or re-render) applies here
 * too, and an LLM call is long enough to make that failure mode more likely, not less.
 * The client (generate-brief-button.tsx) calls this directly, races it against a
 * timeout, and refreshes the page itself once it has a real result.
 */
export async function generateMorningBriefAction(): Promise<GenerateActionResult> {
  const ctx = await requireManagerAccess();
  const result = await generateMorningBrief(ctx.orgId);
  const failure = describeFailure(result);
  return failure ? { ok: false, error: failure } : { ok: true };
}

export async function generateCoachingPrepAction(formData: FormData): Promise<GenerateActionResult> {
  const ctx = await requireManagerAccess();
  const repId = String(formData.get("repId") ?? "");
  if (!repId) return { ok: false, error: "Missing rep id." };
  const result = await prepareCoachingSession(ctx.orgId, repId);
  const failure = describeFailure(result);
  return failure ? { ok: false, error: failure } : { ok: true };
}
