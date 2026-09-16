"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface KnowledgeSourceRow {
  id: string;
  name: string;
  type: "text" | "url" | "pdf";
  status: "pending" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-surface-raised text-ink-muted",
  processing: "bg-warning/15 text-warning",
  ready: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
};

type AddMode = "text" | "url" | "pdf";

export function KnowledgeTab({ agentId, initialSources }: { agentId: string; initialSources: KnowledgeSourceRow[] }) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [mode, setMode] = useState<AddMode>("text");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/sales/agents/${agentId}/knowledge`);
    if (res.ok) {
      const data = await res.json();
      setSources(data.sources);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let res: Response;
      if (mode === "pdf") {
        if (!file) throw new Error("Choose a PDF file first.");
        const form = new FormData();
        form.set("file", file);
        res = await fetch(`/api/sales/agents/${agentId}/knowledge`, { method: "POST", body: form });
      } else {
        res = await fetch(`/api/sales/agents/${agentId}/knowledge`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: mode, name: name || (mode === "url" ? content : "Pasted text"), content }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add source.");
      setName("");
      setContent("");
      setFile(null);
      await refresh();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add source.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(sourceId: string) {
    await fetch(`/api/sales/agents/${agentId}/knowledge/${sourceId}`, { method: "DELETE" });
    setSources(sources.filter((s) => s.id !== sourceId));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Add knowledge</h2>
        {error && <div className="mb-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
        <div className="mb-3 inline-flex rounded-md border border-border p-0.5">
          {(["text", "url", "pdf"] as AddMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`rounded px-3 py-1 text-xs ${mode === m ? "bg-surface-raised text-ink" : "text-ink-muted"}`}
              onClick={() => setMode(m)}
            >
              {m === "text" ? "Paste text" : m === "url" ? "Website URL" : "PDF upload"}
            </button>
          ))}
        </div>
        <form onSubmit={handleAdd} className="space-y-3">
          {mode !== "pdf" && (
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pricing FAQ" />
            </div>
          )}
          {mode === "text" && (
            <div>
              <label className="label">Content</label>
              <textarea className="input" rows={6} required value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
          )}
          {mode === "url" && (
            <div>
              <label className="label">URL</label>
              <input className="input" required type="url" value={content} onChange={(e) => setContent(e.target.value)} placeholder="https://example.com/pricing" />
              <p className="mt-1 text-xs text-ink-faint">Fetched and indexed in the background — status updates below once ready.</p>
            </div>
          )}
          {mode === "pdf" && (
            <div>
              <label className="label">PDF file</label>
              <input
                className="input"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-ink-faint">Text is extracted at upload time — scanned/image-only PDFs aren't supported yet.</p>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Sources ({sources.length})</div>
        {sources.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-faint">
            No knowledge yet — this agent will say it doesn't know rather than guessing until you add some.
          </p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{s.name}</div>
                  <div className="text-[11px] text-ink-faint">
                    {s.type} · added {new Date(s.createdAt).toLocaleDateString()}
                    {s.errorMessage ? ` · ${s.errorMessage}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`badge ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                  <button type="button" className="btn-ghost text-danger" onClick={() => handleDelete(s.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
