"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgentActions({ agentId, status }: { agentId: string; status: "draft" | "enabled" | "disabled" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: "enabled" | "disabled") {
    setBusy(true);
    await fetch(`/api/agents/${agentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
    setBusy(false);
  }

  async function clone() {
    setBusy(true);
    const res = await fetch(`/api/agents/${agentId}/clone`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const data = await res.json();
    setBusy(false);
    if (data.agent) router.push(`/agents/${data.agent.id}`);
  }

  async function remove() {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
    router.push("/agents");
  }

  return (
    <div className="flex items-center gap-2">
      {status === "enabled" ? (
        <button className="btn-secondary" disabled={busy} onClick={() => setStatus("disabled")}>
          Disable
        </button>
      ) : (
        <button className="btn-secondary" disabled={busy} onClick={() => setStatus("enabled")}>
          Enable
        </button>
      )}
      <button className="btn-secondary" disabled={busy} onClick={clone}>
        Clone
      </button>
      <button className="btn-ghost text-danger" disabled={busy} onClick={remove}>
        Delete
      </button>
    </div>
  );
}
