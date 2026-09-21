"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { managerRepo } from "@ai-agent/storage";
import { requireManagerAccess } from "@/lib/manager-access";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function optStr(formData: FormData, key: string): string | undefined {
  const v = str(formData, key);
  return v.length > 0 ? v : undefined;
}
function num(formData: FormData, key: string): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

// ---- Reps ----

export async function createRepAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const name = str(formData, "name");
  if (!name) redirect("/manager/reps?error=" + encodeURIComponent("Name is required."));

  await managerRepo.createRep({
    orgId: ctx.orgId,
    name,
    email: optStr(formData, "email"),
    team: optStr(formData, "team"),
  });
  revalidatePath("/manager/reps");
  revalidatePath("/manager");
  redirect("/manager/reps");
}

export async function updateRepStatusAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const repId = str(formData, "repId");
  const status = str(formData, "status") as "active" | "inactive";
  await managerRepo.updateRep(ctx.orgId, repId, { status });
  revalidatePath("/manager/reps");
  revalidatePath(`/manager/reps/${repId}`);
}

// ---- Performance snapshots ----

export async function logSnapshotAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const repId = str(formData, "repId");
  const dateStr = str(formData, "date");
  if (!repId || !dateStr) redirect(`/manager/reps/${repId}?error=` + encodeURIComponent("Rep and date are required."));

  await managerRepo.upsertSnapshot({
    orgId: ctx.orgId,
    repId,
    date: new Date(`${dateStr}T00:00:00Z`),
    dials: num(formData, "dials"),
    connects: num(formData, "connects"),
    appointments: num(formData, "appointments"),
    sales: num(formData, "sales"),
    talkTimeMinutes: num(formData, "talkTimeMinutes"),
    source: "manual",
    notes: optStr(formData, "notes"),
  });
  revalidatePath(`/manager/reps/${repId}`);
  revalidatePath("/manager");
}

// ---- Coaching sessions ----

export async function createCoachingSessionAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const repId = str(formData, "repId");
  const agreedFocus = str(formData, "agreedFocus");
  if (!repId || !agreedFocus) redirect(`/manager/reps/${repId}?error=` + encodeURIComponent("The agreed focus area is required."));

  const followUpDateStr = optStr(formData, "followUpDate");
  await managerRepo.createCoachingSession({
    orgId: ctx.orgId,
    repId,
    managerUserId: ctx.userId,
    diagnosedCause: optStr(formData, "diagnosedCause") as "effort" | "leads" | "confidence" | "skill" | "script" | "other" | undefined,
    summary: optStr(formData, "summary"),
    agreedFocus,
    followUpDate: followUpDateStr ? new Date(`${followUpDateStr}T00:00:00Z`) : undefined,
  });
  revalidatePath(`/manager/reps/${repId}`);
  revalidatePath("/manager");
}

export async function updateCoachingOutcomeAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const sessionId = str(formData, "sessionId");
  const repId = str(formData, "repId");
  const outcome = str(formData, "outcome") as "pending" | "worked" | "partially_worked" | "not_worked" | "escalated";
  await managerRepo.updateCoachingOutcome(ctx.orgId, sessionId, outcome, optStr(formData, "outcomeNotes"));
  revalidatePath(`/manager/reps/${repId}`);
}

// ---- Open threads ----

export async function createOpenThreadAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const description = str(formData, "description");
  if (!description) redirect("/manager/threads?error=" + encodeURIComponent("Description is required."));

  const dueAtStr = optStr(formData, "dueAt");
  await managerRepo.createOpenThread({
    orgId: ctx.orgId,
    repId: optStr(formData, "repId"),
    managerUserId: ctx.userId,
    description,
    category: (optStr(formData, "category") as "commitment" | "follow_up" | "operational" | "other") ?? "commitment",
    dueAt: dueAtStr ? new Date(`${dueAtStr}T00:00:00Z`) : undefined,
  });
  const redirectRepId = optStr(formData, "repId");
  revalidatePath("/manager/threads");
  revalidatePath("/manager");
  if (redirectRepId) revalidatePath(`/manager/reps/${redirectRepId}`);
}

export async function setThreadStatusAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const threadId = str(formData, "threadId");
  const status = str(formData, "status") as "open" | "done" | "dropped";
  const repId = optStr(formData, "repId");
  await managerRepo.setThreadStatus(ctx.orgId, threadId, status);
  revalidatePath("/manager/threads");
  revalidatePath("/manager");
  if (repId) revalidatePath(`/manager/reps/${repId}`);
}

// ---- Compliance cases ----

export async function createComplianceCaseAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const repId = str(formData, "repId");
  const description = str(formData, "description");
  if (!repId || !description) redirect("/manager/compliance?error=" + encodeURIComponent("Rep and description are required."));

  await managerRepo.createComplianceCase({
    orgId: ctx.orgId,
    repId,
    flaggedByUserId: ctx.userId,
    severity: (optStr(formData, "severity") as "low" | "medium" | "high" | "critical") ?? "medium",
    source: (optStr(formData, "source") as "qa_review" | "complaint" | "manual" | "other") ?? "manual",
    description,
  });
  revalidatePath("/manager/compliance");
  revalidatePath("/manager");
  revalidatePath(`/manager/reps/${repId}`);
}

export async function setComplianceCaseStatusAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const caseId = str(formData, "caseId");
  const status = str(formData, "status") as "open" | "under_review" | "escalated";
  const repId = optStr(formData, "repId");
  await managerRepo.setComplianceCaseStatus(ctx.orgId, caseId, status);
  revalidatePath("/manager/compliance");
  if (repId) revalidatePath(`/manager/reps/${repId}`);
}

/** The only path that can close a compliance case — always attributed to the signed-in human manager, never automatable. */
export async function resolveComplianceCaseAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const caseId = str(formData, "caseId");
  const repId = optStr(formData, "repId");
  const resolutionNotes = str(formData, "resolutionNotes");
  if (!resolutionNotes) redirect("/manager/compliance?error=" + encodeURIComponent("Resolution notes are required to close a compliance case."));

  await managerRepo.resolveComplianceCase(ctx.orgId, caseId, ctx.userId, resolutionNotes);
  revalidatePath("/manager/compliance");
  revalidatePath("/manager");
  if (repId) revalidatePath(`/manager/reps/${repId}`);
}

// ---- Team focus areas ----

export async function createTeamFocusAreaAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const theme = str(formData, "theme");
  const weekOfStr = str(formData, "weekOf");
  if (!theme || !weekOfStr) redirect("/manager/focus?error=" + encodeURIComponent("Theme and week are required."));

  await managerRepo.createTeamFocusArea({
    orgId: ctx.orgId,
    weekOf: new Date(`${weekOfStr}T00:00:00Z`),
    theme,
    rationale: optStr(formData, "rationale"),
    createdByUserId: ctx.userId,
  });
  revalidatePath("/manager/focus");
  revalidatePath("/manager");
}

export async function updateFocusAreaAdoptionAction(formData: FormData) {
  const ctx = await requireManagerAccess();
  const focusId = str(formData, "focusId");
  const adoptionNotes = str(formData, "adoptionNotes");
  await managerRepo.updateFocusAreaAdoption(ctx.orgId, focusId, adoptionNotes);
  revalidatePath("/manager/focus");
}
