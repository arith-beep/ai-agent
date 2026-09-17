"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plug, Plus, Trash2, Webhook } from "lucide-react";

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
    <div>
      <div className="mb-5">
        <h2 className="font-display text-[17px] font-semibold text-fg">Tools</h2>
        <p className="mt-0.5 text-[13px] text-fg-muted">What your agent can actually do, beyond talking.</p>
      </div>

      {error && <div className="mb-4 rounded-pnl border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-[13px] text-critical">{error}</div>}

      <div className="surface mb-5">
        <div className="border-b border-hairline px-5 py-3.5 text-[13.5px] font-medium text-fg">Attached</div>
        {attached.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-fg-faint">No tools attached yet.</p>
        ) : (
          <div className="divide-y divide-hairline-soft">
            {attached.map((row) => (
              <div key={row.tool.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pnl bg-brand-soft text-brand">
                    <Plug size={14} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] text-fg">{row.tool.name}</div>
                    <div className="truncate text-[12px] text-fg-faint">{row.tool.description}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[12px] text-fg-muted">
                    <input type="checkbox" className="accent-[rgb(var(--brand))]" checked={row.enabled} onChange={(e) => toggle(row.tool.id, e.target.checked)} />
                    Enabled
                  </label>
                  <button type="button" className="rounded-pnl p-1.5 text-fg-faint hover:bg-critical-soft hover:text-critical" onClick={() => detach(row.tool.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
          <span className="text-[13.5px] font-medium text-fg">Available</span>
          <button type="button" className="btn-outline gap-1.5 !py-1.5 text-[12.5px]" onClick={() => setWebhookOpen((v) => !v)}>
            <Webhook size={13} />
            {webhookOpen ? "Cancel" : "Add webhook"}
          </button>
        </div>
        {webhookOpen && (
          <form onSubmit={createWebhook} className="space-y-3 border-b border-hairline-soft bg-sunken/50 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Name</label>
                <input className="field" required value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="Notify CRM" />
              </div>
              <div>
                <label className="field-label">Method</label>
                <select className="field" value={webhookMethod} onChange={(e) => setWebhookMethod(e.target.value as typeof webhookMethod)}>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label">Endpoint URL</label>
              <input className="field" required type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.example.com/lead" />
            </div>
            <div>
              <label className="field-label">Description (tells the agent when to use it)</label>
              <textarea className="field min-h-[64px]" required value={webhookDescription} onChange={(e) => setWebhookDescription(e.target.value)} />
            </div>
            <button type="submit" className="btn-brand" disabled={submitting}>
              {submitting ? "Creating..." : "Create & attach"}
            </button>
          </form>
        )}
        {available.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-fg-faint">All available tools are attached.</p>
        ) : (
          <div className="divide-y divide-hairline-soft">
            {available.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pnl bg-sunken text-fg-faint">
                    <Plug size={14} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] text-fg">{tool.name}</div>
                    <div className="truncate text-[12px] text-fg-faint">{tool.description}</div>
                  </div>
                </div>
                <button type="button" className="btn-outline shrink-0 gap-1 !py-1.5 text-[12.5px]" onClick={() => attach(tool.id)}>
                  <Plus size={13} />
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
