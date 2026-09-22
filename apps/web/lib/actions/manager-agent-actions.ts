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

function describeFailure(result: { status: string; provider?: string; modelName?: string; message?: string }): string | null {
  if (result.status === "ready") return null;
  if (result.status === "not_configured") return "Set up a Manager Agent model below before generating a brief.";
  if (result.status === "credential_missing") return `The configured provider (${result.provider}/${result.modelName}) has no API key — add one under Settings > Models.`;
  return `Generation failed: ${result.message ?? "unknown error"}`;
}

export async function generateMorningBriefAction() {
  const ctx = await requireManagerAccess();
  const result = await generateMorningBrief(ctx.orgId);
  revalidatePath("/manager");
  const failure = describeFailure(result);
  if (failure) redirect("/manager?error=" + encodeURIComponent(failure));
}

export async function generateCoachingPrepAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const repId = String(formData.get("repId") ?? "");
  if (!repId) redirect("/manager/reps?error=" + encodeURIComponent("Missing rep id."));
  const result = await prepareCoachingSession(ctx.orgId, repId);
  revalidatePath(`/manager/reps/${repId}`);
  const failure = describeFailure(result);
  if (failure) redirect(`/manager/reps/${repId}?error=` + encodeURIComponent(failure));
}
