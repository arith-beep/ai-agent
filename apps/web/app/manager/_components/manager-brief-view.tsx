import type { MorningBrief } from "@ai-agent/manager-agent";

export function ManagerBriefView({
  brief,
  generatedAt,
  droppedClaimsCount,
  repById,
}: {
  brief: MorningBrief;
  generatedAt: Date;
  droppedClaimsCount: number;
  repById: Map<string, { name: string }>;
}) {
  return (
    <div className="space-y-3 border-t border-hairline-soft pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] text-fg">{brief.summary}</p>
        <span className="shrink-0 text-[11px] text-fg-faint">{new Date(generatedAt).toLocaleString()}</span>
      </div>

      {droppedClaimsCount > 0 && (
        <p className="rounded-pnl bg-caution-soft px-3 py-2 text-[12px] text-caution">
          {droppedClaimsCount} claim{droppedClaimsCount === 1 ? "" : "s"} the model made couldn&rsquo;t be verified against real data and{" "}
          {droppedClaimsCount === 1 ? "was" : "were"} removed before this was shown.
        </p>
      )}

      {brief.insufficientData && <p className="text-[12.5px] text-fg-muted">Not enough real data existed yet to produce a full brief.</p>}

      {brief.complianceCases.length > 0 && (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">Compliance</div>
          {brief.complianceCases.map((c) => (
            <div key={c.caseId} className="mt-1 text-[13px] text-fg">
              <span className="font-medium">{repById.get(c.repId)?.name ?? "Unknown rep"}:</span> {c.summary}
            </div>
          ))}
        </div>
      )}

      {brief.needsAttention.length > 0 && (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">Needs attention</div>
          {brief.needsAttention.map((r) => (
            <div key={r.repId} className="mt-1 text-[13px] text-fg">
              <span className="font-medium">{r.repName}:</span> {r.reason}
            </div>
          ))}
        </div>
      )}

      {brief.strongPerformers.length > 0 && (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">Strong performers</div>
          {brief.strongPerformers.map((r) => (
            <div key={r.repId} className="mt-1 text-[13px] text-fg">
              <span className="font-medium">{r.repName}:</span> {r.reason}
            </div>
          ))}
        </div>
      )}

      {brief.openThreadsHighlight.length > 0 && (
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">Open threads</div>
          {brief.openThreadsHighlight.map((t) => (
            <div key={t.threadId} className="mt-1 text-[13px] text-fg">
              {t.summary}
            </div>
          ))}
        </div>
      )}

      {brief.currentFocusNote && <p className="text-[12.5px] text-fg-muted">{brief.currentFocusNote}</p>}
      {brief.continuityNote && <p className="text-[12.5px] italic text-fg-muted">{brief.continuityNote}</p>}
    </div>
  );
}
