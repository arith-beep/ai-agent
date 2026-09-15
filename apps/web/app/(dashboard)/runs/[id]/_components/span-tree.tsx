type Span = {
  id: string;
  parentSpanId: string | null;
  type: string;
  name: string;
  status: string;
  input: unknown;
  output: unknown;
  errorMessage: string | null;
  durationMs: number | null;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
  cost: string | null;
};

const TYPE_ICON: Record<string, string> = {
  agent_run: "●",
  model_call: "◆",
  tool_call: "■",
  workflow_step: "▶",
  knowledge_retrieval: "▲",
  agent_message: "✉",
};

function truncate(value: unknown, max = 400): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function SpanNode({ span, spans, depth }: { span: Span; spans: Span[]; depth: number }) {
  const children = spans.filter((s) => s.parentSpanId === span.id);
  const statusColor = span.status === "success" ? "text-success" : span.status === "error" ? "text-danger" : "text-accent";

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="rounded-md border border-border-subtle bg-surface-raised px-3 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={statusColor}>{TYPE_ICON[span.type] ?? "●"}</span>
            <span className="font-medium text-ink">{span.name}</span>
            <span className="badge bg-canvas text-ink-faint">{span.type}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-faint">
            {span.tokenUsage && <span>{span.tokenUsage.totalTokens} tok</span>}
            {span.cost && <span>${Number(span.cost).toFixed(5)}</span>}
            {span.durationMs !== null && <span>{span.durationMs}ms</span>}
          </div>
        </div>
        {span.input !== null && span.input !== undefined && (
          <div className="mt-1.5 truncate font-mono text-xs text-ink-muted" title={truncate(span.input, 2000)}>
            in: {truncate(span.input)}
          </div>
        )}
        {span.output !== null && span.output !== undefined && (
          <div className="mt-1 truncate font-mono text-xs text-ink-muted" title={truncate(span.output, 2000)}>
            out: {truncate(span.output)}
          </div>
        )}
        {span.errorMessage && <div className="mt-1 text-xs text-danger">{span.errorMessage}</div>}
      </div>
      {children.length > 0 && (
        <div className="mt-1.5 space-y-1.5 border-l border-border-subtle pl-2">
          {children.map((child) => (
            <SpanNode key={child.id} span={child} spans={spans} depth={depth} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SpanTree({ spans }: { spans: Span[] }) {
  const roots = spans.filter((s) => !s.parentSpanId);
  if (roots.length === 0) return <p className="text-sm text-ink-faint">No spans recorded yet.</p>;
  return (
    <div className="space-y-2">
      {roots.map((root) => (
        <SpanNode key={root.id} span={root} spans={spans} depth={0} />
      ))}
    </div>
  );
}
