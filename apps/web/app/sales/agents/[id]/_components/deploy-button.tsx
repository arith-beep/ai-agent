"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeployButton({ agentId, status }: { agentId: string; status: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deploy() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/sales/agents/${agentId}/deploy`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to deploy.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" className="btn-primary" disabled={submitting} onClick={deploy}>
        {submitting ? "Deploying..." : status === "active" ? "Redeploy" : "Deploy"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
