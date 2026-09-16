"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AttachedToolRow {
  tool: { id: string; name: string; description: string; category: string };
  enabled: boolean;
}
export interface AvailableToolRow {
  id: string;
  name: string;
  description: string;
  category: string;
}

export function ToolsTab({
  agentId,
  initialAttached,
  initialAvailable,
}: {
  agentId: string;
  initialAttached: AttachedToolRow[];
  initialAvailable: AvailableToolRow[];
}) {
  const router = useRouter();
  const [attached, setAttached] = useState(initialAttached);
  const [available, setAvailable] = useState(initialAvailable);
  const [error, setError] = useState<string | null>(null);

  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookDescription, setWebhookDescription] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookMethod, setWebhookMethod] = useState<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">("POST");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/sales/agents/${agentId}/tools`);
    if (res.ok) {
      const data = await res.json();
      setAttached(data.attached);
      setAvailable(data.available);
    }
    router.refresh();
  }

  async function attach(toolId: string) {
    setError(null);
    const res = await fetch(`/api/sales/agents/${agentId}/tools`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toolId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to attach tool.");
      return;
    }
    await refresh();
  }

  async function detach(toolId: string) {
    await fetch(`/api/sales/agents/${agentId}/tools/${toolId}`, { method: "DELETE" });
    await refresh();
  }

  async function toggle(toolId: string, enabled: boolean) {
    await fetch(`/api/sales/agents/${agentId}/tools/${toolId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await refresh();
  }

  async function createWebhook(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/agents/${agentId}/tools/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: webhookName,
          description: webhookDescription,
          category: "custom",
          requiresApproval: false,
          params: [{ name: "payload", type: "string", description: "JSON payload to send", required: true }],
          executionConfig: { kind: "http", url: webhookUrl, method: webhookMethod },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create webhook.");
      setWebhookOpen(false);
      setWebhookName("");
      setWebhookDescription("");
      setWebhookUrl("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="card border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Attached tools</div>
        {attached.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-faint">No tools attached yet.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {attached.map((row) => (
              <div key={row.tool.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-ink">{row.tool.name}</div>
                  <div className="truncate text-xs text-ink-faint">{row.tool.description}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input type="checkbox" checked={row.enabled} onChange={(e) => toggle(row.tool.id, e.target.checked)} />
                    Enabled
                  </label>
                  <button type="button" className="btn-ghost text-danger" onClick={() => detach(row.tool.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-medium text-ink">Available tools</span>
          <button type="button" className="btn-secondary" onClick={() => setWebhookOpen((v) => !v)}>
            {webhookOpen ? "Cancel" : "+ Add Webhook"}
          </button>
        </div>
        {webhookOpen && (
          <form onSubmit={createWebhook} className="space-y-3 border-b border-border-subtle px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Name</label>
                <input className="input" required value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="Notify CRM" />
              </div>
              <div>
                <label className="label">Method</label>
                <select className="input" value={webhookMethod} onChange={(e) => setWebhookMethod(e.target.value as typeof webhookMethod)}>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Endpoint URL</label>
              <input className="input" required type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.example.com/lead" />
            </div>
            <div>
              <label className="label">Description (tells the agent when to use it)</label>
              <textarea className="input" rows={2} required value={webhookDescription} onChange={(e) => setWebhookDescription(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create & attach"}
            </button>
          </form>
        )}
        {available.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-faint">All available tools are attached.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {available.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-ink">{tool.name}</div>
                  <div className="truncate text-xs text-ink-faint">{tool.description}</div>
                </div>
                <button type="button" className="btn-secondary shrink-0" onClick={() => attach(tool.id)}>
                  Attach
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
