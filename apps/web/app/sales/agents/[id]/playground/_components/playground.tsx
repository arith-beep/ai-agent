"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
}
interface ToolCallDebug {
  name: string;
  input: unknown;
  output?: unknown;
  status: "success" | "error";
  errorMessage?: string;
  durationMs: number;
}
interface LeadSnapshot {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  statusReason: string | null;
}
interface TurnDebug {
  retrievedChunks: RetrievedChunk[];
  toolCalls: ToolCallDebug[];
  latencyMs: number;
  model: string;
  error?: string;
  lead: LeadSnapshot | null;
}

export function Playground({ agentId, agentName, modelLabel }: { agentId: string; agentName: string; modelLabel: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [debug, setDebug] = useState<TurnDebug | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function startNewSession() {
    setMessages([]);
    setDebug(null);
    setError(null);
    const res = await fetch(`/api/sales/agents/${agentId}/playground`, { method: "POST" });
    const data = await res.json();
    setConversationId(data.conversation?.id ?? null);
  }

  useEffect(() => {
    startNewSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleClear() {
    if (!conversationId) return;
    await fetch(`/api/sales/conversations/${conversationId}/messages`, { method: "DELETE" });
    setMessages([]);
    setDebug(null);
    setError(null);
  }

  async function send() {
    if (!input.trim() || !conversationId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setError(null);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: text }]);

    try {
      const res = await fetch(`/api/sales/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send message.");
      setMessages((m) => [...m, { id: `local-${Date.now()}-a`, role: "assistant", content: data.assistantText }]);
      setDebug(data.debug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-[340px_1fr] gap-4">
      {/* LEFT: config / debug */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        <div className="card p-4">
          <div className="text-xs font-medium text-ink-muted">Agent</div>
          <div className="mt-1 text-sm text-ink">{agentName}</div>
          <div className="mt-0.5 font-mono text-[11px] text-ink-faint">{modelLabel}</div>
        </div>

        <div className="card p-4">
          <div className="mb-2 text-xs font-medium text-ink-muted">Qualification state</div>
          {debug?.lead ? (
            <div className="space-y-1 text-sm">
              <div className="text-ink">{debug.lead.name ?? debug.lead.email ?? "Unnamed lead"}</div>
              <div className="badge bg-accent/15 text-accent">{debug.lead.status}</div>
              {debug.lead.statusReason && <div className="text-[11px] text-ink-faint">{debug.lead.statusReason}</div>}
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No lead captured yet.</p>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-2 text-xs font-medium text-ink-muted">Latency</div>
          <p className="text-sm text-ink">{debug ? `${debug.latencyMs}ms` : "—"}</p>
        </div>

        <div className="card p-4">
          <div className="mb-2 text-xs font-medium text-ink-muted">Retrieved knowledge</div>
          {debug && debug.retrievedChunks.length > 0 ? (
            <div className="space-y-2">
              {debug.retrievedChunks.map((c) => (
                <div key={c.id} className="rounded border border-border-subtle p-2 text-[11px]">
                  <div className="mb-1 text-ink-faint">score {c.score.toFixed(3)}</div>
                  <div className="line-clamp-3 text-ink-muted">{c.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No retrieval this turn.</p>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-2 text-xs font-medium text-ink-muted">Tool calls</div>
          {debug && debug.toolCalls.length > 0 ? (
            <div className="space-y-2">
              {debug.toolCalls.map((call, i) => (
                <div key={i} className="rounded border border-border-subtle p-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-ink">{call.name}</span>
                    <span className={`badge ${call.status === "success" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                      {call.status}
                    </span>
                  </div>
                  <div className="mt-1 text-ink-faint">in: {JSON.stringify(call.input)}</div>
                  <div className="text-ink-faint">out: {JSON.stringify(call.status === "success" ? call.output : call.errorMessage)}</div>
                  <div className="mt-1 text-ink-faint">{call.durationMs}ms</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No tool calls this turn.</p>
          )}
        </div>

        {debug?.error && (
          <div className="card border-danger/40 bg-danger/10 p-4">
            <div className="mb-1 text-xs font-medium text-danger">Error</div>
            <p className="text-[11px] text-danger">{debug.error}</p>
          </div>
        )}
      </div>

      {/* RIGHT: chat */}
      <div className="flex flex-col card p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-ink">Test conversation</span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={handleClear}>
              Reset conversation
            </button>
            <button type="button" className="btn-ghost" onClick={handleClear}>
              Clear history
            </button>
            <button type="button" className="btn-secondary" onClick={startNewSession}>
              New test session
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && <p className="py-10 text-center text-sm text-ink-faint">Say hello to start testing this agent.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-accent text-white" : "bg-surface-raised text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && <p className="text-xs text-ink-faint">Thinking...</p>}
        </div>

        {error && <div className="mx-4 mb-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</div>}

        <div className="flex gap-2 border-t border-border p-3">
          <input
            className="input"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={!conversationId || sending}
          />
          <button type="button" className="btn-primary" onClick={send} disabled={!conversationId || sending || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
