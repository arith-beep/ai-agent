"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveHandoffButton({ handoffId }: { handoffId: string }) {
  const router = useRouter();
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    setResolving(true);
    setError(null);
    const res = await fetch(`/api/sales/handoffs/${handoffId}/resolve`, { method: "POST" });
    setResolving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to resolve handoff.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" className="btn-primary" disabled={resolving} onClick={resolve}>
        {resolving ? "Resolving..." : "Resolve handoff"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
