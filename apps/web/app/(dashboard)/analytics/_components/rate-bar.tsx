/** A success/error ratio, encoded with the app's reserved status colors (green/red) — never repurposed as a generic categorical pair. */
export function RateBar({ success, error }: { success: number; error: number }) {
  const total = success + error;
  if (total === 0) return <div className="h-1.5 w-24 rounded-full bg-border-subtle" />;
  const successPct = (success / total) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-border-subtle">
        <div className="h-full bg-success" style={{ width: `${successPct}%` }} />
        <div className="h-full bg-danger" style={{ width: `${100 - successPct}%` }} />
      </div>
      <span className="text-xs text-ink-muted">{successPct.toFixed(0)}%</span>
    </div>
  );
}
