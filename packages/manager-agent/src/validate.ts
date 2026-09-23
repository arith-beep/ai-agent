import type { MorningBrief, CoachingPrep } from "./schemas";
import type { Evidence } from "./evidence";

/**
 * The actual anti-fabrication guardrail — not a prompt instruction, code.
 * Every id the model cited in its structured output is checked against what
 * a tool call genuinely returned. Anything that doesn't match is stripped
 * before the result is ever persisted or shown to the manager, and counted
 * so it's visible that something was dropped.
 */

export interface ValidationResult<T> {
  content: T;
  droppedClaimsCount: number;
  droppedDetails: string[];
}

export function validateMorningBrief(brief: MorningBrief, evidence: Evidence): ValidationResult<MorningBrief> {
  const details: string[] = [];

  const complianceCases = brief.complianceCases.filter((c) => {
    const known = evidence.cases.get(c.caseId);
    const ok = Boolean(known) && known!.repId === c.repId;
    if (!ok) details.push(`Dropped uncited compliance case reference: ${c.caseId}`);
    return ok;
  });

  const needsAttention = brief.needsAttention.filter((r) => {
    const ok = evidence.reps.has(r.repId);
    if (!ok) details.push(`Dropped uncited rep reference (needsAttention): ${r.repId}`);
    return ok;
  });

  const strongPerformers = brief.strongPerformers.filter((r) => {
    const ok = evidence.reps.has(r.repId);
    if (!ok) details.push(`Dropped uncited rep reference (strongPerformers): ${r.repId}`);
    return ok;
  });

  const openThreadsHighlight = brief.openThreadsHighlight.filter((t) => {
    const ok = evidence.threads.has(t.threadId);
    if (!ok) details.push(`Dropped uncited thread reference: ${t.threadId}`);
    return ok;
  });

  return {
    content: { ...brief, complianceCases, needsAttention, strongPerformers, openThreadsHighlight },
    droppedClaimsCount: details.length,
    droppedDetails: details,
  };
}

export function validateCoachingPrep(prep: CoachingPrep, evidence: Evidence): ValidationResult<CoachingPrep> {
  const details: string[] = [];

  if (!evidence.reps.has(prep.repId)) {
    details.push(`Coaching prep repId ${prep.repId} was not seen via any tool call — this result should not be trusted`);
  }

  const priorSessionsReferenced = prep.priorSessionsReferenced.filter((s) => {
    const known = evidence.coachingSessions.get(s.sessionId);
    const ok = Boolean(known) && known!.repId === prep.repId;
    if (!ok) details.push(`Dropped uncited coaching session reference: ${s.sessionId}`);
    return ok;
  });

  return {
    content: { ...prep, priorSessionsReferenced },
    droppedClaimsCount: details.length,
    droppedDetails: details,
  };
}
