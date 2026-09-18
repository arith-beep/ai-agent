"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function LandingNav({ authed }: { authed: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-hairline/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-fg text-[13px] font-semibold text-paper">S</span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-fg">Sales Agent Builder</span>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          <a href="#how-it-works" className="text-[13.5px] font-medium text-fg-muted transition-colors hover:text-fg">
            How it works
          </a>
          <a href="#product" className="text-[13.5px] font-medium text-fg-muted transition-colors hover:text-fg">
            Product
          </a>
          {authed ? (
            <Link href="/sales" className="btn-brand !py-1.5 !px-4 text-[13.5px]">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13.5px] font-medium text-fg-muted transition-colors hover:text-fg">
                Log in
              </Link>
              <Link href="/signup" className="btn-brand !py-1.5 !px-4 text-[13.5px]">
                Build your Sales Agent
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-pnl text-fg md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline bg-paper px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm font-medium text-fg-muted">
              How it works
            </a>
            <a href="#product" onClick={() => setOpen(false)} className="text-sm font-medium text-fg-muted">
              Product
            </a>
            {authed ? (
              <Link href="/sales" className="btn-brand w-full">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-fg-muted">
                  Log in
                </Link>
                <Link href="/signup" className="btn-brand w-full">
                  Build your Sales Agent
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
