"use client";

import { motion } from "framer-motion";
import { Blocks, BookOpen, Plug, FlaskConical, Rocket } from "lucide-react";

const STEPS = [
  { icon: Blocks, label: "Build", copy: "Describe your business in one prompt, or configure identity and playbook by hand." },
  { icon: BookOpen, label: "Train", copy: "Add pricing pages, docs, or pasted text — your agent answers only from what it knows." },
  { icon: Plug, label: "Connect", copy: "Attach lead capture, meeting requests, human handoff, or your own webhooks." },
  { icon: FlaskConical, label: "Test", copy: "Talk to your agent in a live playground and inspect exactly how it reasons." },
  { icon: Rocket, label: "Deploy", copy: "Publish it and start qualifying real conversations, with every lead tracked." },
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
            From idea to a live agent, five steps
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
