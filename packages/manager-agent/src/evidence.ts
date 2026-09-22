/**
 * Everything the Manager Agent's tools actually returned during Phase 1
 * (evidence gathering). Phase 2 (structured synthesis) only ever sees this,
 * never raw DB access — and Phase 3 (validate.ts) checks every id the model
 * cites in its final output against exactly what's recorded here. If a tool
 * was never called, or a rep/case/thread/session id never appeared in a
 * tool's result, it cannot legitimately appear in the final brief.
 */

export interface RepEvidence {
  repId: string;
  name: string;
  team: string | null;
  status: string;
}

export interface RepTrendEvidence {
  repId: string;
  recentSalesPerDay: number;
  baselineSalesPerDay: number;
  recentDialsPerDay: number;
  baselineDialsPerDay: number;
  daysOfData: number;
  flag: string;
}

export interface ComplianceCaseEvidence {
  caseId: string;
  repId: string;
  severity: string;
  status: string;
  description: string;
}

export interface OpenThreadEvidence {
  threadId: string;
  repId: string | null;
  description: string;
  category: string;
  dueAt: string | null;
}

export interface CoachingSessionEvidence {
  sessionId: string;
  repId: string;
  sessionDate: string;
  diagnosedCause: string | null;
  agreedFocus: string;
  outcome: string;
  outcomeNotes: string | null;
}

export class Evidence {
  reps = new Map<string, RepEvidence>();
  trends = new Map<string, RepTrendEvidence>();
  cases = new Map<string, ComplianceCaseEvidence>();
  threads = new Map<string, OpenThreadEvidence>();
  coachingSessions = new Map<string, CoachingSessionEvidence>();
  focusArea: { theme: string; rationale: string | null } | null = null;
  previousBriefSummary: string | null = null;

  toolCallLog: { name: string; input: unknown; resultSummary: string }[] = [];

  repIds(): string[] {
    return [...this.reps.keys()];
  }
  caseIds(): string[] {
    return [...this.cases.keys()];
  }
  threadIds(): string[] {
    return [...this.threads.keys()];
  }
  sessionIds(): string[] {
    return [...this.coachingSessions.keys()];
  }
}
