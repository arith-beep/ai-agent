"use client";

import { useRef, useState } from "react";

type ExecutionEvent =
  | { type: "run-started"; runId: string; at: string }
  | { type: "text-delta"; runId: string; text: string }
  | { type: "tool-call-start"; runId: string; spanId: string; toolName: string; input: unknown }
  | { type: "tool-call-result"; runId: string; spanId: string; toolName: string; output: unknown; status: "success" | "error" }
  | { type: "knowledge-retrieval"; runId: string; spanId: string; query: string; results: unknown[] }
  | { type: "agent-message"; runId: string; direction: "outgoing" | "incoming"; withAgentId: string; kind: string }
  | { type: "approval-required"; runId: string; approvalId: string; actionType: string }
  | { type: "run-completed"; runId: string; output: unknown; tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number }; estimatedCost: number; durationMs: number }
  | { type: "run-failed"; runId: string; errorMessage: string };

interface TraceEvent {
  id: string;
  label: string;
  detail?: string;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
  trace: TraceEvent[];
  stats?: { tokenUsage: { totalTokens: number }; estimatedCost: number; durationMs: number };
  error?: string;
  pending?: boolean;
}

export function Playground({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  async function send() {
    if (!input.trim() || busy) return;
    const message = input;
    setInput("");
    setBusy(true);

    setTurns((prev) => [...prev, { role: "user", text: message, trace: [] }, { role: "assistant", text: "", trace: [], pending: true }]);

    const res = await fetch(`/api/agents/${agentId}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setTurns((prev) => updateLastAssistant(prev, (t) => ({ ...t, pending: false, error: body.error ?? "Failed to start run." })));
      setBusy(false);
      return;
    }

    const { runId } = await res.json();
    esRef.current?.close();
    const es = new EventSource(`/api/runs/${runId}/events`);
    esRef.current = es;

    es.onmessage = (evt) => {
      const data = JSON.parse(evt.data) as ExecutionEvent | { type: "connected"; runId: string };
      if (data.type === "connected") return;
      handleEvent(data);
    };
    es.onerror = () => {
      es.close();
      setBusy(false);
    };

    function handleEvent(event: ExecutionEvent) {
      setTurns((prev) =>
        updateLastAssistant(prev, (t) => {
          switch (event.type) {
            case "run-started":
              return t;
            case "text-delta":
              return { ...t, text: t.text + event.text };
            case "tool-call-start":
              return { ...t, trace: [...t.trace, { id: event.spanId, label: `Calling tool: ${event.toolName}`, detail: JSON.stringify(event.input) }] };
            case "tool-call-result":
              return {
                ...t,
                trace: t.trace.map((e) =>
                  e.id === event.spanId ? { ...e, label: `${event.status === "success" ? "✓" : "✗"} ${event.toolName}`, detail: JSON.stringify(event.output) } : e,
                ),
              };
            case "knowledge-retrieval":
              return { ...t, trace: [...t.trace, { id: event.spanId, label: `Retrieved knowledge for: "${event.query}"`, detail: `${event.results.length} result(s)` }] };
            case "agent-message":
              return { ...t, trace: [...t.trace, { id: `${event.runId}-msg-${t.trace.length}`, label: `Sent "${event.kind}" message to agent ${event.withAgentId.slice(0, 8)}...` }] };
            case "approval-required":
              return { ...t, trace: [...t.trace, { id: event.approvalId, label: `⏸ Approval required: ${event.actionType}` }] };
            case "run-completed":
              return { ...t, pending: false, stats: { tokenUsage: event.tokenUsage, estimatedCost: event.estimatedCost, durationMs: event.durationMs } };
            case "run-failed":
              return { ...t, pending: false, error: event.errorMessage };
            default:
              return t;
          }
        }),
      );
      if (event.type === "run-completed" || event.type === "run-failed") {
        setBusy(false);
      }
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-3 text-sm text-ink-muted">Testing <span className="text-ink font-medium">{agentName}</span> — structured execution trace, not raw chain-of-thought.</div>
      <div className="flex-1 space-y-4 overflow-y-auto rounded-card border border-border bg-surface p-4">
        {turns.length === 0 && <p className="text-sm text-ink-faint">Send a message to start.</p>}
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${turn.role === "user" ? "bg-accent text-white" : "bg-surface-raised text-ink"}`}>
              {turn.role === "assistant" && turn.trace.length > 0 && (
                <div className="mb-2 space-y-1 border-b border-border-subtle pb-2">
                  {turn.trace.map((e) => (
                    <div key={e.id} className="font-mono text-xs text-ink-faint" title={e.detail}>
                      {e.label}
                    </div>
                  ))}
                </div>
              )}
              {turn.pending && !turn.text && <span className="text-ink-faint">Thinking...</span>}
              <div className="whitespace-pre-wrap">{turn.text}</div>
              {turn.error && <div className="mt-1 text-xs text-danger">{turn.error}</div>}
              {turn.stats && (
                <div className="mt-2 flex gap-3 border-t border-border-subtle pt-1.5 text-[11px] text-ink-faint">
                  <span>{turn.stats.tokenUsage.totalTokens} tokens</span>
                  <span>${turn.stats.estimatedCost.toFixed(5)}</span>
                  <span>{turn.stats.durationMs}ms</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message the agent..."
          disabled={busy}
        />
        <button className="btn-primary" onClick={send} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

function updateLastAssistant(turns: Turn[], updater: (t: Turn) => Turn): Turn[] {
  const idx = turns.map((t) => t.role).lastIndexOf("assistant");
  const current = idx === -1 ? undefined : turns[idx];
  if (idx === -1 || !current) return turns;
  const next = [...turns];
  next[idx] = updater(current);
  return next;
}
