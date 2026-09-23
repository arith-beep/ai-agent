"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";

const STEPS = [
  { key: "company", question: "What's your company called?", placeholder: "Northwind SaaS", hint: "This is who your agent will represent." },
  { key: "product", question: "What do you sell?", placeholder: "A project-management platform for growing teams", hint: "A sentence or two is plenty." },
  {
    key: "goal",
    question: "What should your agent accomplish?",
    placeholder: "Qualify inbound leads on team size and timeline, then book product demos",
    hint: "Its primary objective — you can refine everything after.",
  },
] as const;

const ASSEMBLY_STEPS = [
  "Understanding your company...",
  "Building your sales playbook...",
  "Creating qualification criteria...",
  "Preparing guardrails...",
];

export function OnboardingWizard({ userName }: { userName: string }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({ company: "", product: "", goal: "" });
  const [phase, setPhase] = useState<"form" | "assembling" | "error">("form");
  const [assemblyStep, setAssemblyStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [stepIndex]);

  const step = STEPS[stepIndex] ?? STEPS[0];
  const value = answers[step.key];
  const isLast = stepIndex === STEPS.length - 1;

  function next() {
    if (!value.trim()) return;
    if (isLast) {
      void generate();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  async function generate() {
    setPhase("assembling");
    setError(null);
    const prompt = `Company: ${answers.company}. What they sell: ${answers.product}. Primary goal for the sales agent: ${answers.goal}.`;

    const stepTimer = setInterval(() => {
      setAssemblyStep((s) => Math.min(s + 1, ASSEMBLY_STEPS.length - 1));
    }, 900);

    try {
      const genRes = await fetch("/api/sales/agents/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error ?? "Couldn't generate a configuration.");

      const createRes = await fetch("/api/sales/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...genData.config.identity, playbook: genData.config.playbook, guardrails: genData.config.guardrails }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? "Couldn't create the agent.");

      clearInterval(stepTimer);
      setAssemblyStep(ASSEMBLY_STEPS.length);
      setTimeout(() => router.push(`/sales/agents/${createData.agent.id}?onboarded=1`), 900);
    } catch (err) {
      clearInterval(stepTimer);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }

  if (phase === "assembling" || phase === "error") {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-[24px] font-semibold tracking-tight text-fg">Building {answers.company || "your agent"}&rsquo;s agent</h1>
        <div className="mt-8 space-y-3 text-left">
          {ASSEMBLY_STEPS.map((label, i) => {
            const done = i < assemblyStep || assemblyStep >= ASSEMBLY_STEPS.length;
            const active = i === assemblyStep && phase === "assembling";
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: i <= assemblyStep || assemblyStep >= ASSEMBLY_STEPS.length ? 1 : 0.35, x: 0 }}
                className="flex items-center gap-3 rounded-pnl border border-hairline bg-panel px-4 py-3"
              >
                {done ? (
                  <Check size={16} className="text-positive" strokeWidth={2.5} />
                ) : active ? (
                  <Loader2 size={16} className="animate-spin text-brand" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-hairline" />
                )}
                <span className={`text-[13.5px] ${done ? "text-fg" : "text-fg-muted"}`}>{label}</span>
              </motion.div>
            );
          })}
          {assemblyStep >= ASSEMBLY_STEPS.length && phase === "assembling" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-pnl border border-positive/30 bg-positive-soft px-4 py-3">
              <Check size={16} className="text-positive" strokeWidth={2.5} />
              <span className="text-[13.5px] font-medium text-positive">Agent ready</span>
            </motion.div>
          )}
        </div>
        {phase === "error" && (
          <div className="mt-6 space-y-3">
            <p className="text-[13px] text-critical">{error}</p>
            <button type="button" className="btn-outline" onClick={() => setPhase("form")}>
              Back to setup
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= stepIndex ? "bg-brand" : "bg-hairline"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          <p className="mb-1.5 text-[12.5px] font-medium uppercase tracking-wide text-fg-faint">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <h1 className="font-display text-balance text-[26px] font-semibold leading-tight tracking-tight text-fg sm:text-[30px]">{step.question}</h1>
          <p className="mt-2 text-[13.5px] text-fg-muted">{step.hint}</p>

          <div className="mt-6">
            {step.key === "company" ? (
              <input
                ref={inputRef}
                className="field h-12 text-[15px]"
                value={value}
                placeholder={step.placeholder}
                onChange={(e) => setAnswers((a) => ({ ...a, [step.key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && next()}
              />
            ) : (
              <textarea
                ref={inputRef as never}
                className="field min-h-[100px] text-[15px]"
                value={value}
                placeholder={step.placeholder}
                onChange={(e) => setAnswers((a) => ({ ...a, [step.key]: e.target.value }))}
              />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className={`btn-subtle gap-1.5 ${stepIndex === 0 ? "invisible" : ""}`}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <button type="button" onClick={next} disabled={!value.trim()} className="btn-brand gap-1.5">
              {isLast ? "Generate my Sales Agent" : "Continue"}
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {stepIndex === 0 && <p className="mt-10 text-center text-[13px] text-fg-faint">Welcome, {userName}. Let&rsquo;s build your first sales agent.</p>}
    </div>
  );
}
