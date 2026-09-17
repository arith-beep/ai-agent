"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "engaged", label: "Engaged" },
  { value: "qualified", label: "Qualified" },
  { value: "unqualified", label: "Unqualified" },
  { value: "meeting_requested", label: "Meeting requested" },
  { value: "meeting_booked", label: "Meeting booked" },
  { value: "human_handoff", label: "Human handoff" },
];

const SINCE_OPTIONS = [
  { value: "", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export interface AgentOption {
  id: string;
  name: string;
}

export function LeadsFilterBar({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-fg-faint">
        <SlidersHorizontal size={13} strokeWidth={1.75} />
        Filter
      </span>
      <select
        className="field w-auto min-w-[9rem] flex-none py-1.5 text-[13px]"
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="field w-auto min-w-[9rem] flex-none py-1.5 text-[13px]"
        value={searchParams.get("agentId") ?? ""}
        onChange={(e) => setParam("agentId", e.target.value)}
      >
        <option value="">All agents</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <select
        className="field w-auto min-w-[8rem] flex-none py-1.5 text-[13px]"
        value={searchParams.get("since") ?? ""}
        onChange={(e) => setParam("since", e.target.value)}
      >
        {SINCE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
