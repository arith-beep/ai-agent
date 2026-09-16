"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = ["queued", "running", "waiting_approval", "completed", "failed", "cancelled"] as const;

export function RunFilters({ agents }: { agents: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const agentId = searchParams.get("agentId") ?? "";

  function update(key: "status" | "agentId", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/runs?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select className="input w-auto" value={agentId} onChange={(e) => update("agentId", e.target.value)}>
        <option value="">All agents</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <select className="input w-auto" value={status} onChange={(e) => update("status", e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
