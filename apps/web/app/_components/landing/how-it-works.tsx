"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, ShieldAlert, Users, GraduationCap, ListChecks } from "lucide-react";

const STEPS = [
  { icon: LayoutDashboard, label: "Monitor", copy: "See team dials, connects, and 14-day trends the moment you log in." },
  { icon: ShieldAlert, label: "Compliance first", copy: "Open cases surface for your review before anything else — never auto-resolved." },
  { icon: Users, label: "Investigate", copy: "Open a rep's profile for their real trend, open threads, and coaching history." },
  { icon: GraduationCap, label: "Coach", copy: "Generate an evidence-backed coaching prep before every 1:1, grounded in past sessions." },
  { icon: ListChecks, label: "Stay in control", copy: "Every suggestion cites its source. The AI never disciplines or acts on your behalf." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-hairline bg-sunken/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-14 max-w-xl"
        >
          <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-wider text-brand">How it works</p>
          <h2 className="font-display text-balance text-[30px] font-semibold tracking-tight text-fg sm:text-[36px]">
            A daily rhythm for running the floor
          </h2>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
              className="group relative surface p-5 transition-shadow duration-200 hover:shadow-elevate-md"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-pnl bg-brand-soft text-brand">
                <step.icon size={18} strokeWidth={1.75} />
              </div>
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-fg-faint">0{i + 1}</span>
                <h3 className="font-display text-[15.5px] font-semibold text-fg">{step.label}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-fg-muted">{step.copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
