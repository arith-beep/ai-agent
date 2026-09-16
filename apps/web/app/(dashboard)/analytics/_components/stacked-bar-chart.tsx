const STATUS_COLORS: Record<string, string> = {
  completed: "bg-success",
  success: "bg-success",
  failed: "bg-danger",
  error: "bg-danger",
  waiting_approval: "bg-warning",
  suspended: "bg-warning",
  running: "bg-accent",
  queued: "bg-ink-faint",
  cancelled: "bg-ink-faint",
};

const CHART_HEIGHT = 140;

export interface DayBucket {
  day: string;
  total: number;
  segments: { status: string; count: number }[];
}

/**
 * A stacked bar chart, colored by run status — status is a reserved encoding
 * (see the dataviz skill), so this reuses the same success/warning/danger/accent
 * tokens the rest of the dashboard already uses for those states, rather than
 * inventing a categorical palette. Pure CSS hover (group-hover), no client JS.
 */
export function StackedBarChart({ title, data }: { title: string; data: DayBucket[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const statuses = [...new Set(data.flatMap((d) => d.segments.map((s) => s.status)))];

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        {statuses.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            {statuses.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[s] ?? "bg-ink-faint"}`} />
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
      {data.every((d) => d.total === 0) ? (
        <p className="py-8 text-center text-sm text-ink-faint">No runs in this period.</p>
      ) : (
        <div className="flex items-end gap-1" style={{ height: CHART_HEIGHT }}>
          {data.map((d) => (
            <div key={d.day} className="group relative flex-1">
              <div className="flex flex-col-reverse gap-0.5 overflow-hidden rounded-t-sm" style={{ height: CHART_HEIGHT }}>
                {d.total === 0 ? (
                  <div className="h-1 w-full rounded-sm bg-border-subtle" />
                ) : (
                  d.segments
                    .filter((seg) => seg.count > 0)
                    .map((seg) => (
                      <div
                        key={seg.status}
                        className={`w-full ${STATUS_COLORS[seg.status] ?? "bg-ink-faint"}`}
                        style={{ height: `${Math.max(2, (seg.count / max) * CHART_HEIGHT)}px` }}
                      />
                    ))
                )}
              </div>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                <div className="font-medium text-ink">
                  {new Date(`${d.day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {d.total} total
                </div>
                {d.segments
                  .filter((seg) => seg.count > 0)
                  .map((seg) => (
                    <div key={seg.status} className="text-ink-muted">
                      {seg.status.replace(/_/g, " ")}: {seg.count}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
