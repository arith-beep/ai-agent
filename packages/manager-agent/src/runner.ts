import { generateText, generateObject, type LanguageModel } from "ai";
import { resolveManagerModel } from "@ai-agent/model-providers";
import { managerRepo, recordManagerAgentDiag } from "@ai-agent/storage";
import { Evidence } from "./evidence";
import { buildManagerTools } from "./tools";
import { buildMorningBriefSystemPrompt, buildCoachingPrepSystemPrompt } from "./system-prompt";
import { morningBriefSchema, coachingPrepSchema, type MorningBrief, type CoachingPrep } from "./schemas";
import { validateMorningBrief, validateCoachingPrep } from "./validate";
import { describeGenerationError } from "./errors";

const MAX_TOOL_STEPS = 6;

type GenerationResult<T> =
  | { status: "not_configured" }
  | { status: "credential_missing"; provider: string; modelName: string }
  | { status: "error"; message: string }
  | { status: "ready"; content: T; droppedClaimsCount: number; droppedDetails: string[]; briefId: string };

/**
 * Phase 1 (evidence gathering) uses `generateText` with read-only tools —
 * the model decides what to look at, everything it sees is captured into
 * `evidence` regardless of what ends up in the final output. Phase 2
 * (`generateObject`) only ever receives that captured evidence as context,
 * never raw DB access, and its output is validated against it (validate.ts)
 * before anything is persisted. See tools.ts and validate.ts for the two
 * halves of the anti-fabrication guardrail this design depends on.
 */
async function gatherEvidence(orgId: string, model: LanguageModel, system: string, prompt: string): Promise<Evidence> {
  const evidence = new Evidence();
  const tools = buildManagerTools(orgId, evidence);
  await generateText({ model, system, prompt, tools, maxSteps: MAX_TOOL_STEPS });
  return evidence;
}

async function handleGenerationError(orgId: string, error: unknown, phase: "evidence gathering" | "brief synthesis"): Promise<{ status: "error"; message: string }> {
  const { userMessage, logDetail, apiDetail } = describeGenerationError(error, phase);
  console.error(logDetail);
  if (apiDetail) {
    await recordManagerAgentDiag({ orgId, phase, ...apiDetail });
  }
  return { status: "error", message: userMessage };
}

function evidenceContext(evidence: Evidence): string {
  return JSON.stringify({
    reps: [...evidence.reps.values()],
    trends: [...evidence.trends.values()],
    complianceCases: [...evidence.cases.values()],
    openThreads: [...evidence.threads.values()],
    coachingSessions: [...evidence.coachingSessions.values()],
    focusArea: evidence.focusArea,
    previousBrief: evidence.previousBriefSummary,
  });
}

export async function generateMorningBrief(orgId: string): Promise<GenerationResult<MorningBrief>> {
  const resolution = await resolveManagerModel(orgId);
  if (resolution.status !== "ready") return resolution;

  const system = buildMorningBriefSystemPrompt();
  let evidence: Evidence;
  try {
    evidence = await gatherEvidence(orgId, resolution.model, system, "Gather what you need for today's morning brief using your tools, then stop.");
  } catch (error) {
    return handleGenerationError(orgId, error, "evidence gathering");
  }

  try {
    const { object } = await generateObject({
      model: resolution.model,
      schema: morningBriefSchema,
      system: `${system}\n\nHere is the evidence you gathered — use only this, do not call any more tools:\n${evidenceContext(evidence)}`,
      prompt: "Produce the final structured morning brief from the evidence above.",
    });

    const validated = validateMorningBrief(object, evidence);
    const brief = await managerRepo.createManagerBrief({
      orgId,
      type: "morning_brief",
      modelProvider: resolution.provider,
      modelName: resolution.modelName,
      content: validated.content,
      evidenceRepIds: evidence.repIds(),
      evidenceCaseIds: evidence.caseIds(),
      evidenceThreadIds: evidence.threadIds(),
      droppedClaimsCount: validated.droppedClaimsCount,
    });

    return { status: "ready", content: validated.content, droppedClaimsCount: validated.droppedClaimsCount, droppedDetails: validated.droppedDetails, briefId: brief.id };
  } catch (error) {
    return handleGenerationError(orgId, error, "brief synthesis");
  }
}

export async function prepareCoachingSession(orgId: string, repId: string): Promise<GenerationResult<CoachingPrep>> {
  const resolution = await resolveManagerModel(orgId);
  if (resolution.status !== "ready") return resolution;

  const system = buildCoachingPrepSystemPrompt();
  let evidence: Evidence;
  try {
    evidence = await gatherEvidence(
      orgId,
      resolution.model,
      system,
      `Gather what you need to prepare a coaching session for rep ${repId} using your tools (their coaching history first, then their trend, then any open threads/compliance tied to them), then stop.`,
    );
  } catch (error) {
    return handleGenerationError(orgId, error, "evidence gathering");
  }

  try {
    const { object } = await generateObject({
      model: resolution.model,
      schema: coachingPrepSchema,
      system: `${system}\n\nHere is the evidence you gathered — use only this, do not call any more tools:\n${evidenceContext(evidence)}`,
      prompt: `Produce the final structured coaching prep for rep ${repId} from the evidence above.`,
    });

    const validated = validateCoachingPrep(object, evidence);
    const brief = await managerRepo.createManagerBrief({
      orgId,
      type: "coaching_prep",
      repId,
      modelProvider: resolution.provider,
      modelName: resolution.modelName,
      content: validated.content,
      evidenceRepIds: evidence.repIds(),
      evidenceCaseIds: evidence.caseIds(),
      evidenceThreadIds: evidence.threadIds(),
      droppedClaimsCount: validated.droppedClaimsCount,
    });

    return { status: "ready", content: validated.content, droppedClaimsCount: validated.droppedClaimsCount, droppedDetails: validated.droppedDetails, briefId: brief.id };
  } catch (error) {
    return handleGenerationError(orgId, error, "brief synthesis");
  }
}
