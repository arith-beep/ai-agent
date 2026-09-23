"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";

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
      <button type="button" className="btn-brand gap-1.5" disabled={submitting} onClick={deploy}>
        <Rocket size={14} />
        {submitting ? "Deploying..." : status === "active" ? "Redeploy" : "Deploy"}
      </button>
      {error && <span className="text-[11.5px] text-critical">{error}</span>}
    </div>
  );
}
