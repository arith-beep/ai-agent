"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, Users, ListChecks, ShieldAlert, Target, GraduationCap } from "lucide-react";
import { BrowserFrame } from "./browser-frame";

function DashboardMock() {
  const nav = [
    { label: "Overview", icon: LayoutDashboard, active: true },
    { label: "Team Roster", icon: Users },
    { label: "Open Threads", icon: ListChecks },
    { label: "Compliance", icon: ShieldAlert },
  ];
  return (
    <div className="flex h-[340px] text-[13px]">
      <div className="hidden w-40 shrink-0 border-r border-hairline bg-sunken/60 p-3 sm:block">
        {nav.map((item) => (
          <div
            key={item.label}
            className={`mb-1 flex items-center gap-2 rounded-pnl px-2.5 py-2 ${item.active ? "bg-panel text-fg shadow-elevate-sm" : "text-fg-faint"}`}
          >
            <item.icon size={14} strokeWidth={1.75} />
            <span className="text-[12.5px] font-medium">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 space-y-3 p-5">
        <div className="rounded-pnl border border-critical/30 bg-critical/5 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-critical">
            <ShieldAlert size={12} />
            Open compliance case — review before anything else
          </div>
          <p className="text-[12px] leading-relaxed text-fg-muted">Flagged from QA sampling. Needs a human listen before any conclusion.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-pnl border border-hairline-soft bg-sunken/60 p-3">
            <div className="mb-1 text-[11px] font-semibold text-fg-muted">Needs a look</div>
            <p className="text-[12px] text-fg-faint">Below own 14-day baseline</p>
          </div>
          <div className="rounded-pnl border border-hairline-soft bg-sunken/60 p-3">
            <div className="mb-1 text-[11px] font-semibold text-fg-muted">Strong week</div>
            <p className="text-[12px] text-fg-faint">Above own 14-day baseline</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoachingPrepMock() {
  return (
    <div className="flex h-[340px] flex-col text-[13px]">
      <div className="flex-1 space-y-3 overflow-hidden p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-fg-muted">
          <GraduationCap size={13} className="text-brand" />
          Coaching prep
        </div>
        <div className="rounded-pnl border border-hairline-soft bg-sunken/60 p-3">
          <div className="mb-1 text-[11px] font-semibold text-fg-muted">Prior session</div>
          <p className="text-[12px] leading-relaxed text-fg-faint">References the rep&rsquo;s last logged coaching session and its outcome — not generic advice.</p>
        </div>
        <div className="rounded-pnl border border-hairline-soft bg-sunken/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
            <Target size={12} />
            Suggested focus
          </div>
          <p className="text-[12px] leading-relaxed text-fg-faint">Grounded in real trend data and open threads tied to this rep.</p>
        </div>
      </div>
      <div className="border-t border-hairline bg-sunken/60 p-3.5">
        <span className="text-[11.5px] text-fg-faint">A draft for the manager to use — it never decides the outcome for you.</span>
      </div>
    </div>
  );
}

export function Showcase() {
  return (
    <section id="product" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-14 max-w-xl"
        >
          <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-wider text-brand">The product</p>
          <h2 className="font-display text-balance text-[30px] font-semibold tracking-tight text-fg sm:text-[36px]">
            Built for the manager, not a chatbot for your customers
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
            One dashboard for team performance, compliance, open commitments, and coaching — every figure and claim
            traceable back to a real record.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55 }}>
            <BrowserFrame title="Manager Dashboard">
              <DashboardMock />
            </BrowserFrame>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <BrowserFrame title="Coaching Prep">
              <CoachingPrepMock />
            </BrowserFrame>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
