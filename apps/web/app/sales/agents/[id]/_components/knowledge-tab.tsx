"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Globe, FileUp, Trash2, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

export interface KnowledgeSourceRow {
  id: string;
  name: string;
  type: "text" | "url" | "pdf";
  status: "pending" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  createdAt: string;
}

const STATUS_META: Record<string, { icon: typeof Clock; className: string; label: string }> = {
  pending: { icon: Clock, className: "bg-sunken text-fg-muted", label: "Pending" },
  processing: { icon: Loader2, className: "bg-caution-soft text-caution", label: "Processing" },
  ready: { icon: CheckCircle2, className: "bg-positive-soft text-positive", label: "Ready" },
  failed: { icon: XCircle, className: "bg-critical-soft text-critical", label: "Failed" },
};

type AddMode = "text" | "url" | "pdf";
const MODES: { key: AddMode; label: string; icon: typeof FileText }[] = [
  { key: "text", label: "Paste text", icon: FileText },
  { key: "url", label: "Website URL", icon: Globe },
  { key: "pdf", label: "PDF upload", icon: FileUp },
];

export function KnowledgeTab({
  agentId,
  initialSources,
  urlIngestionAvailable,
}: {
  agentId: string;
  initialSources: KnowledgeSourceRow[];
  urlIngestionAvailable: boolean;
}) {
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
    if (res.ok) setSources((await res.json()).sources);
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
    <div>
      <div className="mb-5">
        <h2 className="font-display text-[17px] font-semibold text-fg">Knowledge</h2>
        <p className="mt-0.5 text-[13px] text-fg-muted">What your agent can answer from — it will say so rather than guess if this is empty.</p>
      </div>

      <div className="surface mb-5 p-5">
        {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const disabled = m.key === "url" && !urlIngestionAvailable;
            return (
              <button
                key={m.key}
                type="button"
                disabled={disabled}
                title={disabled ? "Not available in this deployment (no background queue is configured)" : undefined}
                onClick={() => !disabled && setMode(m.key)}
                className={`flex flex-col items-center gap-1.5 rounded-pnl-lg border px-3 py-3.5 transition-colors duration-150 ${
                  disabled
                    ? "cursor-not-allowed border-hairline text-fg-faint opacity-50"
                    : mode === m.key
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-hairline text-fg-muted hover:border-fg-faint hover:text-fg"
                }`}
              >
                <m.icon size={17} strokeWidth={1.75} />
                <span className="text-[12px] font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>
        {!urlIngestionAvailable && (
          <p className="mb-4 -mt-2 text-[11.5px] text-fg-faint">Website URL isn&rsquo;t available in this deployment — no background queue is configured. Paste text or upload a PDF instead.</p>
        )}
        <form onSubmit={handleAdd} className="space-y-3">
          {mode !== "pdf" && (
            <div>
              <label className="field-label">Name</label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pricing FAQ" />
            </div>
          )}
          {mode === "text" && (
            <div>
              <label className="field-label">Content</label>
              <textarea className="field min-h-[120px]" required value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
          )}
          {mode === "url" && (
            <div>
              <label className="field-label">URL</label>
              <input className="field" required type="url" value={content} onChange={(e) => setContent(e.target.value)} placeholder="https://example.com/pricing" />
              <p className="mt-1.5 text-[11.5px] text-fg-faint">Fetched and indexed in the background — status updates below once ready.</p>
            </div>
          )}
          {mode === "pdf" && (
            <div>
              <label className="field-label">PDF file</label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-pnl-lg border-2 border-dashed border-hairline px-4 py-8 text-center transition-colors hover:border-brand hover:bg-brand-soft/40">
                <FileUp size={20} className="text-fg-faint" strokeWidth={1.5} />
                <span className="text-[13px] text-fg-muted">{file ? file.name : "Drop a PDF here or click to browse"}</span>
                <input className="hidden" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <p className="mt-1.5 text-[11.5px] text-fg-faint">Text is extracted at upload time — scanned/image-only PDFs aren&rsquo;t supported yet.</p>
            </div>
          )}
          <button type="submit" className="btn-brand" disabled={submitting}>
            {submitting ? "Adding..." : "Add source"}
          </button>
        </form>
      </div>

      <div className="surface">
        <div className="border-b border-hairline px-5 py-3.5 text-[13.5px] font-medium text-fg">Sources ({sources.length})</div>
        {sources.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-fg-faint">No knowledge yet.</p>
        ) : (
          <div className="divide-y divide-hairline-soft">
            {sources.map((s) => {
              const meta = STATUS_META[s.status] ?? STATUS_META.pending!;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] text-fg">{s.name}</div>
                    <div className="text-[11.5px] text-fg-faint">
                      {s.type} · added {new Date(s.createdAt).toLocaleDateString()}
                      {s.errorMessage ? ` · ${s.errorMessage}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span className={`chip gap-1 ${meta.className}`}>
                      <meta.icon size={11} className={s.status === "processing" ? "animate-spin" : ""} />
                      {meta.label}
                    </span>
                    <button type="button" className="rounded-pnl p-1.5 text-fg-faint hover:bg-critical-soft hover:text-critical" onClick={() => handleDelete(s.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
