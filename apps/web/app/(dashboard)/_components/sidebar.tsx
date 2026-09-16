"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/workflows", label: "Workflows" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/tools", label: "Tools" },
  { href: "/models", label: "Models" },
  { href: "/tasks", label: "Tasks" },
  { href: "/messages", label: "Messages" },
  { href: "/conversations", label: "Conversations" },
  { href: "/approvals", label: "Approvals" },
  { href: "/schedules", label: "Schedules" },
  { href: "/runs", label: "Runs" },
  { href: "/analytics", label: "Analytics" },
  { href: "/integrations", label: "Integrations" },
  { href: "/settings", label: "Settings" },
] as const;

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">A</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{orgName}</div>
          <div className="text-[11px] text-ink-faint">Agent Platform</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-surface-raised text-ink font-medium" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
