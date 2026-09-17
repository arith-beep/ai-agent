"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { LeadStatusBadge, ConversationStatusBadge } from "../../_components/status-badge";

export interface ConversationListItem {
  id: string;
  leadName: string | null;
  leadEmail: string | null;
  agentId: string;
  agentName: string;
  status: string;
  leadStatus: string | null;
  lastMessageAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "handoff", label: "Handoff" },
  { value: "closed", label: "Closed" },
];

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function ConversationsShell({
  items,
  agents,
  children,
}: {
  items: ConversationListItem[];
  agents: { id: string; name: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeId = pathname?.split("/sales/conversations/")[1];
  const hasActive = Boolean(activeId);

  const [status, setStatus] = useState("");
  const [agentId, setAgentId] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (status && row.status !== status) return false;
      if (agentId && row.agentId !== agentId) return false;
      if (query) {
        const haystack = `${row.leadName ?? ""} ${row.leadEmail ?? ""} ${row.agentName}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, status, agentId, query]);

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[420px] overflow-hidden rounded-pnl-xl border border-hairline bg-panel shadow-elevate-md">
      <div className={`${hasActive ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col md:w-[300px] md:border-r md:border-hairline`}>
        <div className="space-y-2 border-b border-hairline p-3">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint" />
            <input
              className="field !py-1.5 !pl-8 text-[12.5px]"
              placeholder="Search conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            <select className="field !py-1.5 text-[12px]" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select className="field !py-1.5 text-[12px]" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12.5px] text-fg-faint">
              {items.length === 0 ? "No conversations yet." : "No conversations match these filters."}
            </p>
          ) : (
            filtered.map((row) => {
              const active = row.id === activeId;
              return (
                <Link
                  key={row.id}
                  href={`/sales/conversations/${row.id}`}
                  className={`block border-b border-hairline-soft px-4 py-3 transition-colors ${active ? "bg-brand-soft" : "hover:bg-sunken"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-[13px] font-medium ${active ? "text-brand" : "text-fg"}`}>
                      {row.leadName ?? row.leadEmail ?? "Anonymous visitor"}
                    </span>
                    <span className="shrink-0 text-[11px] text-fg-faint">{relativeTime(row.lastMessageAt)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-fg-muted">with {row.agentName}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <ConversationStatusBadge status={row.status} />
                    {row.leadStatus && <LeadStatusBadge status={row.leadStatus} />}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className={`${hasActive ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>{children}</div>
    </div>
  );
}
