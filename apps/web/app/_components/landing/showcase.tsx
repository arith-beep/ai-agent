"use client";

import { motion } from "framer-motion";
import { User2, Building2, Target, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { BrowserFrame } from "./browser-frame";

function BuilderMock() {
  const nav = [
    { label: "Identity", icon: User2, active: true },
    { label: "Sales Playbook", icon: Target },
    { label: "Knowledge", icon: Building2 },
    { label: "Guardrails", icon: ShieldCheck },
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
      <div className="flex-1 space-y-4 p-5">
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-fg-faint">Agent name</div>
          <div className="rounded-pnl border border-hairline bg-panel px-3 py-2 text-fg">Nova</div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-fg-faint">Tone</div>
          <div className="flex gap-1.5">
            {["Professional", "Consultative", "Friendly"].map((t, i) => (
              <span key={t} className={`chip border ${i === 1 ? "border-brand bg-brand-soft text-brand" : "border-hairline text-fg-muted"}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-pnl border border-hairline-soft bg-sunken/60 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
            <Sparkles size={12} className="text-brand" /> Live preview
          </div>
          <p className="text-[12.5px] leading-relaxed text-fg-faint">
            &ldquo;Hi, I&rsquo;m Nova from Northwind. I help teams cut project status meetings in half&mdash;what are you using today?&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

function PlaygroundMock() {
  return (
    <div className="flex h-[340px] flex-col text-[13px]">
      <div className="flex-1 space-y-3 overflow-hidden p-5">
        <div className="flex justify-end">
          <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-fg px-3 py-2 text-[12.5px] text-paper">We&rsquo;re a 40-person team.</div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[75%] rounded-2xl rounded-bl-sm border border-hairline bg-panel px-3 py-2 text-[12.5px] text-fg">
            That&rsquo;s right in our sweet spot. Want to see a live demo this week?
          </div>
        </div>
      </div>
      <div className="border-t border-hairline bg-sunken/60 p-3.5">
        <div className="mb-2 text-[11px] font-semibold text-fg-muted">Qualification</div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={15} className="text-positive" />
          <span className="chip bg-positive-soft text-positive">Qualified</span>
          <span className="text-[11.5px] text-fg-faint">40-person team, matches ICP</span>
        </div>
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
            A real builder, not a settings page
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
            Configure identity, playbook, knowledge, tools and guardrails on the left — see exactly how your agent
            would respond on the right, before you ever publish it.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55 }}>
            <BrowserFrame title="Agent Builder">
              <BuilderMock />
            </BrowserFrame>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <BrowserFrame title="Test Playground">
              <PlaygroundMock />
            </BrowserFrame>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
