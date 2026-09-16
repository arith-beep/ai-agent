"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["open", "in_progress", "blocked", "in_review", "done", "cancelled"] as const;

export function TaskStatusControl({ taskId, currentStatus }: { taskId: string; currentStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update status.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={s === currentStatus ? "btn-primary" : "btn-secondary"}
            disabled={busy || s === currentStatus}
            onClick={() => setStatus(s)}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
