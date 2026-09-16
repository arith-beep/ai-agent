"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthConfigForm({ toolId, hasConfig }: { toolId: string; hasConfig: boolean }) {
  const router = useRouter();
  const [json, setJson] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let authConfig: Record<string, unknown>;
    try {
      authConfig = JSON.parse(json);
    } catch {
      setError("Invalid JSON.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/tools/${toolId}/auth-config`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authConfig }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Failed to save.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">Credentials</h2>
        {hasConfig ? (
          <span className="badge bg-success/15 text-success">configured</span>
        ) : (
          <span className="badge bg-ink-faint/15 text-ink-faint">not configured</span>
        )}
      </div>
      <p className="text-xs text-ink-faint">
        Stored encrypted (AES-256-GCM), write-only — never displayed back. E.g. <code className="text-ink">{"{"}&quot;botToken&quot;:&quot;xoxb-...&quot;{"}"}</code> for
        Slack, <code className="text-ink">{"{"}&quot;token&quot;:&quot;ghp_...&quot;{"}"}</code> for GitHub,{" "}
        <code className="text-ink">{"{"}&quot;apiKey&quot;:&quot;...&quot;{"}"}</code> for Web Search,{" "}
        <code className="text-ink">{"{"}&quot;connectionString&quot;:&quot;postgres://...&quot;{"}"}</code> for Database Query.
      </p>
      <form onSubmit={save} className="space-y-2">
        <textarea className="input h-24 font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button type="submit" className="btn-secondary" disabled={busy}>
          Save credentials
        </button>
      </form>
    </div>
  );
}
