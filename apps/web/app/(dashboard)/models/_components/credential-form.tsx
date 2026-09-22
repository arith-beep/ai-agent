"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", envHint: "OPENAI_API_KEY" },
  { id: "anthropic", label: "Anthropic", envHint: "ANTHROPIC_API_KEY" },
  { id: "google", label: "Google", envHint: "GOOGLE_GENERATIVE_AI_API_KEY" },
  { id: "openrouter", label: "OpenRouter", envHint: "OPENROUTER_API_KEY" },
] as const;

export function CredentialForm({ configured }: { configured: string[] }) {
  const router = useRouter();
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]["id"]>("openai");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/models", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    });
    setApiKey("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-sm font-medium text-ink">Model provider credentials</h2>
      <p className="text-xs text-ink-muted">
        Keys are encrypted at rest (AES-256-GCM) and only ever decrypted inside the worker process — never sent to the browser.
      </p>
      <ul className="space-y-1.5">
        {PROVIDERS.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-md border border-border-subtle px-3 py-2 text-sm">
            <span className="text-ink">{p.label}</span>
            {configured.includes(p.id) ? (
              <span className="badge bg-success/15 text-success">configured</span>
            ) : (
              <span className="badge bg-ink-faint/15 text-ink-faint">not configured</span>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex items-end gap-2 pt-2">
        <div className="w-40">
          <label className="label">Provider</label>
          <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">API key</label>
          <input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required placeholder="sk-..." />
        </div>
        <button type="submit" className="btn-primary" disabled={busy || !apiKey}>
          Save
        </button>
      </form>
    </div>
  );
}
