"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/sales", label: "Overview" },
  { href: "/sales/agents", label: "Sales Agents" },
  { href: "/sales/leads", label: "Leads" },
  { href: "/sales/conversations", label: "Conversations" },
  { href: "/sales/knowledge", label: "Knowledge" },
  { href: "/sales/integrations", label: "Integrations" },
  { href: "/sales/analytics", label: "Analytics" },
  { href: "/sales/settings", label: "Settings" },
] as const;

export function SalesSidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">S</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{orgName}</div>
          <div className="text-[11px] text-ink-faint">Sales Agent Builder</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/sales" ? pathname === "/sales" : pathname.startsWith(item.href);
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
      <div className="border-t border-border px-3 py-3">
        <Link href="/" className="text-[11px] text-ink-faint hover:text-ink-muted">
          ← Agent Platform
        </Link>
      </div>
    </aside>
  );
}
