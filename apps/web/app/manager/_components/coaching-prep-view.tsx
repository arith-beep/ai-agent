import type { CoachingPrep } from "@ai-agent/manager-agent";

const HYPOTHESIS_LABEL: Record<string, string> = {
  effort: "Effort",
  leads: "Lead quality",
  confidence: "Confidence",
  skill: "Skill gap",
  script: "Script/technique",
  other: "Other",
  insufficient_data: "Not enough data yet",
};

export function CoachingPrepView({ prep, generatedAt, droppedClaimsCount }: { prep: CoachingPrep; generatedAt: Date; droppedClaimsCount: number }) {
  return (
    <div className="space-y-3 border-t border-hairline-soft pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="chip bg-brand-soft text-brand">{HYPOTHESIS_LABEL[prep.hypothesis] ?? prep.hypothesis}</span>
        <span className="text-[11px] text-fg-faint">{new Date(generatedAt).toLocaleString()}</span>
      </div>

      {droppedClaimsCount > 0 && (
        <p className="rounded-pnl bg-caution-soft px-3 py-2 text-[12px] text-caution">
          {droppedClaimsCount} reference{droppedClaimsCount === 1 ? "" : "s"} couldn&rsquo;t be verified against real data and{" "}
          {droppedClaimsCount === 1 ? "was" : "were"} removed.
        </p>
      )}

      <p className="text-[13px] text-fg">{prep.reasoning}</p>

      {prep.priorSessionsReferenced.length > 0 && (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">Prior coaching this connects to</div>
          {prep.priorSessionsReferenced.map((s) => (
            <div key={s.sessionId} className="mt-1 text-[12.5px] text-fg-muted">
              <span className="font-medium text-fg">{s.agreedFocus}</span> ({s.outcome}) — {s.note}
            </div>
          ))}
        </div>
      )}

      {prep.suggestedFocus && (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">Suggested focus</div>
          <p className="mt-1 text-[13px] text-fg">{prep.suggestedFocus}</p>
        </div>
      )}

      {prep.insufficientData && <p className="text-[12.5px] text-fg-muted">Not enough real data existed yet for a confident hypothesis.</p>}
    </div>
  );
}
