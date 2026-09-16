"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "ai" | "manual";

interface GeneratedConfig {
  identity: { name: string; companyName: string; role: string; description?: string; language: string; tone: string; personality: string[] };
  playbook: Record<string, unknown>;
  guardrails: Record<string, unknown>;
}

export function CreateAgentForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("ai");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI mode
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedConfig | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Manual mode
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("Sales Development Representative");
  const [objective, setObjective] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/sales/agents/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setGenerated(data.config);
      if (!data.aiGenerated) setNote(data.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function createFromGenerated() {
    if (!generated) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...generated.identity, playbook: generated.playbook, guardrails: generated.guardrails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create agent.");
      router.push(`/sales/agents/${data.agent.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent.");
      setSubmitting(false);
    }
  }

  async function createManual(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, companyName, role, playbook: { primaryObjective: objective || "Help visitors and qualify them as leads." } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create agent.");
      router.push(`/sales/agents/${data.agent.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-md border border-border p-0.5">
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-sm ${mode === "ai" ? "bg-surface-raised text-ink" : "text-ink-muted"}`}
          onClick={() => setMode("ai")}
        >
          Describe it (AI)
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-sm ${mode === "manual" ? "bg-surface-raised text-ink" : "text-ink-muted"}`}
          onClick={() => setMode("manual")}
        >
          Start from scratch
        </button>
      </div>

      {error && <div className="card border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      {mode === "ai" ? (
        <div className="card space-y-4 p-5">
          <div>
            <label className="label">What should your sales agent do?</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Create an inbound sales agent for my SaaS company that answers product questions, qualifies leads, handles objections and books demos."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <button type="button" className="btn-secondary" disabled={generating || prompt.trim().length < 10} onClick={handleGenerate}>
            {generating ? "Generating..." : "Generate configuration"}
          </button>

          {note && <div className="card border-warning/40 bg-warning/10 p-3 text-xs text-warning">{note}</div>}

          {generated && (
            <div className="space-y-3 border-t border-border-subtle pt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="label">Agent name</label>
                  <input
                    className="input"
                    value={generated.identity.name}
                    onChange={(e) => setGenerated({ ...generated, identity: { ...generated.identity, name: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="label">Company</label>
                  <input
                    className="input"
                    value={generated.identity.companyName}
                    onChange={(e) => setGenerated({ ...generated, identity: { ...generated.identity, companyName: e.target.value } })}
                  />
                </div>
              </div>
              <p className="text-xs text-ink-faint">
                A full playbook and guardrails have been drafted from your description — you'll be able to review and edit every field in the
                builder before deploying.
              </p>
              <button type="button" className="btn-primary" disabled={submitting} onClick={createFromGenerated}>
                {submitting ? "Creating..." : "Create Sales Agent"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={createManual} className="card space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Agent name</label>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ava" />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input" required value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div>
            <label className="label">Primary objective</label>
            <textarea
              className="input"
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Qualify inbound leads and book product demos."
            />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create Sales Agent"}
          </button>
        </form>
      )}
    </div>
  );
}
