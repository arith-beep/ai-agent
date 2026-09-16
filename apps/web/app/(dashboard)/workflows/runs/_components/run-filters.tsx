"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = ["queued", "running", "suspended", "completed", "failed", "cancelled"] as const;

export function RunFilters({ workflows }: { workflows: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const workflowId = searchParams.get("workflowId") ?? "";

  function update(key: "status" | "workflowId", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/workflows/runs?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select className="input w-auto" value={workflowId} onChange={(e) => update("workflowId", e.target.value)}>
        <option value="">All workflows</option>
        {workflows.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      <select className="input w-auto" value={status} onChange={(e) => update("status", e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
