"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, ListChecks, ShieldAlert, Target, Menu, X, LogOut } from "lucide-react";
import { ThemeToggle } from "../../sales/_components/theme-toggle";
import { logoutAction } from "@/lib/actions/auth-actions";

const NAV_ITEMS = [
  { href: "/manager", label: "Overview", icon: LayoutDashboard },
  { href: "/manager/reps", label: "Team Roster", icon: Users },
  { href: "/manager/threads", label: "Open Threads", icon: ListChecks },
  { href: "/manager/compliance", label: "Compliance", icon: ShieldAlert },
  { href: "/manager/focus", label: "Weekly Focus", icon: Target },
] as const;

function Brand({ orgName }: { orgName: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-fg text-[13px] font-semibold text-paper">M</span>
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-medium text-fg">{orgName}</div>
        <div className="text-[11px] text-fg-faint">AI Sales Manager</div>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/manager" ? pathname === "/manager" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-pnl px-3 py-2 text-[13.5px] transition-colors duration-150 ease-premium ${
              active ? "bg-brand-soft font-medium text-brand" : "text-fg-muted hover:bg-sunken hover:text-fg"
            }`}
          >
            <item.icon size={16} strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ManagerSidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-hairline bg-panel px-4 py-3 md:hidden">
        <Brand orgName={orgName} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-pnl text-fg-muted hover:bg-sunken hover:text-fg"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close navigation menu" className="absolute inset-0 bg-fg/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside className="relative z-50 flex h-full w-72 max-w-[82vw] flex-col border-r border-hairline bg-panel shadow-elevate-lg">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-4">
              <Brand orgName={orgName} />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pnl text-fg-muted hover:bg-sunken hover:text-fg"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
              <Link href="/sales" className="text-[11.5px] text-fg-faint hover:text-fg-muted">
                ← Sales Agents
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="flex items-center gap-1.5 text-[11.5px] text-fg-faint hover:text-fg-muted">
                  <LogOut size={12} strokeWidth={1.75} />
                  Log out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-hairline bg-panel md:flex">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-4">
          <Brand orgName={orgName} />
          <ThemeToggle />
        </div>
        <NavLinks pathname={pathname} />
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
          <Link href="/sales" className="text-[11.5px] text-fg-faint hover:text-fg-muted">
            ← Sales Agents
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-1.5 text-[11.5px] text-fg-faint hover:text-fg-muted" title="Log out">
              <LogOut size={12} strokeWidth={1.75} />
              Log out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
