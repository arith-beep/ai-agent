export function BrowserFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-pnl-xl border border-hairline bg-panel shadow-elevate-lg">
      <div className="flex items-center gap-2 border-b border-hairline bg-sunken px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-critical/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-caution/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-positive/40" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-panel px-3 py-1 text-[11px] text-fg-faint">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="0" />
            <rect x="1.5" y="2.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="0.8" fill="none" />
          </svg>
          {title}
        </div>
      </div>
      <div className="bg-paper">{children}</div>
    </div>
  );
}
