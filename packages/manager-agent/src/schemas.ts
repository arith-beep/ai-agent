import { z } from "zod";

/**
 * Every reference field below is a real id the model must have seen via a
 * tool call. `validate.ts` checks these against the actual evidence
 * collected during tool-calling and strips anything that doesn't match —
 * the schema alone does not guarantee truthfulness, only shape.
 */

export const citedRepSchema = z.object({
  repId: z.string().uuid(),
  repName: z.string(),
  reason: z.string().describe("Specific, concrete reason this rep is listed — cite real numbers from the evidence, not vague language"),
});

export const citedCaseSchema = z.object({
  caseId: z.string().uuid(),
  repId: z.string().uuid(),
  summary: z.string(),
});

export const citedThreadSchema = z.object({
  threadId: z.string().uuid(),
  summary: z.string(),
});

export const morningBriefSchema = z.object({
  summary: z.string().describe("One or two sentence top-line summary of the day ahead"),
  complianceCases: z.array(citedCaseSchema).describe("Every open compliance case — always surfaced first, never omitted"),
  needsAttention: z.array(citedRepSchema).describe("Reps trending below their own baseline or showing another acute signal, per the evidence"),
  strongPerformers: z.array(citedRepSchema).describe("Reps trending above their own baseline"),
  openThreadsHighlight: z.array(citedThreadSchema).describe("Notable open threads, especially anything overdue"),
  currentFocusNote: z.string().nullable().describe("A note on this week's team focus area, or null if none is set"),
  continuityNote: z.string().nullable().describe("A reference to yesterday's brief if relevant — e.g. the same rep flagged again — or null if there was no prior brief or nothing to note"),
  insufficientData: z.boolean().describe("True if there was not enough real data to produce a meaningful brief — set this instead of inventing content"),
});
export type MorningBrief = z.infer<typeof morningBriefSchema>;

export const priorCoachingReferenceSchema = z.object({
  sessionId: z.string().uuid(),
  agreedFocus: z.string(),
  outcome: z.string(),
  note: z.string().describe("Why this prior session is relevant now"),
});

export const coachingPrepSchema = z.object({
  repId: z.string().uuid(),
  hypothesis: z.enum(["effort", "leads", "confidence", "skill", "script", "other", "insufficient_data"]),
  reasoning: z.string().describe("The specific evidence behind the hypothesis — cite real numbers and dates, not generalities"),
  priorSessionsReferenced: z.array(priorCoachingReferenceSchema).describe("Any earlier coaching sessions with this rep that bear on this one — empty array if none exist"),
  suggestedFocus: z.string().nullable().describe("A single, specific suggested focus area for the manager to consider — never a disciplinary, compensation, or lead-reassignment action, those are never this agent's call"),
  insufficientData: z.boolean(),
});
export type CoachingPrep = z.infer<typeof coachingPrepSchema>;
