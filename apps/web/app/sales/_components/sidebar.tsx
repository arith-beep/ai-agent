"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

function Brand({ orgName }: { orgName: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">S</div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-ink">{orgName}</div>
        <div className="text-[11px] text-ink-faint">Sales Agent Builder</div>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/sales" ? pathname === "/sales" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
              active ? "bg-surface-raised text-ink font-medium" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SalesSidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (e.g. after tapping a link).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar — hidden at md: and up, where the fixed sidebar takes over. */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Brand orgName={orgName} />
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile off-canvas drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-50 flex h-full w-64 max-w-[80vw] flex-col border-r border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <Brand orgName={orgName} />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="border-t border-border px-3 py-3">
              <Link href="/" className="text-[11px] text-ink-faint hover:text-ink-muted">
                ← Agent Platform
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop fixed sidebar */}
      <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="border-b border-border px-4 py-4">
          <Brand orgName={orgName} />
        </div>
        <NavLinks pathname={pathname} />
        <div className="border-t border-border px-3 py-3">
          <Link href="/" className="text-[11px] text-ink-faint hover:text-ink-muted">
            ← Agent Platform
          </Link>
        </div>
      </aside>
    </>
  );
}
