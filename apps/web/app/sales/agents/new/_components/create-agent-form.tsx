"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, Sparkles, Wand2 } from "lucide-react";

type Mode = "ai" | "manual";
type Phase = "form" | "assembling" | "review" | "error";

interface GeneratedConfig {
  identity: { name: string; companyName: string; role: string; description?: string; language: string; tone: string; personality: string[] };
  playbook: Record<string, unknown>;
  guardrails: Record<string, unknown>;
}

const ASSEMBLY_STEPS = ["Understanding your company...", "Building your sales playbook...", "Creating qualification criteria...", "Preparing guardrails..."];

export function CreateAgentForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("ai");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [assemblyStep, setAssemblyStep] = useState(0);
  const [generated, setGenerated] = useState<GeneratedConfig | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("Sales Development Representative");
  const [objective, setObjective] = useState("");

  async function handleGenerate() {
    setPhase("assembling");
    setError(null);
    setNote(null);
    setAssemblyStep(0);

    const stepTimer = setInterval(() => setAssemblyStep((s) => Math.min(s + 1, ASSEMBLY_STEPS.length - 1)), 900);

    try {
      const res = await fetch("/api/sales/agents/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      clearInterval(stepTimer);
      setAssemblyStep(ASSEMBLY_STEPS.length);
      setGenerated(data.config);
      if (!data.aiGenerated) setNote(data.note);
      setTimeout(() => setPhase("review"), 700);
    } catch (e) {
      clearInterval(stepTimer);
      setError(e instanceof Error ? e.message : "Generation failed.");
      setPhase("error");
    }
  }

  async function createFromGenerated() {
    if (!generated) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...generated.identity, playbook: generated.playbook, guardrails: generated.guardrails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create agent.");
      router.push(`/sales/agents/${data.agent.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent.");
      setSubmitting(false);
    }
  }

  async function createManual(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, companyName, role, playbook: { primaryObjective: objective || "Help visitors and qualify them as leads." } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create agent.");
      router.push(`/sales/agents/${data.agent.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent.");
      setSubmitting(false);
    }
  }

  if (phase === "assembling" || (phase === "error" && mode === "ai")) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Building your agent</h1>
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

  if (phase === "review" && generated) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface space-y-4 p-6">
        <div className="flex items-center gap-2 text-positive">
          <Check size={16} strokeWidth={2.5} />
          <span className="text-[13.5px] font-medium">Agent ready</span>
        </div>

        {note && <div className="rounded-pnl border border-caution/30 bg-caution-soft px-3 py-2 text-[12.5px] text-caution">{note}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Agent name</label>
            <input
              className="field"
              value={generated.identity.name}
              onChange={(e) => setGenerated({ ...generated, identity: { ...generated.identity, name: e.target.value } })}
            />
          </div>
          <div>
            <label className="field-label">Company</label>
            <input
              className="field"
              value={generated.identity.companyName}
              onChange={(e) => setGenerated({ ...generated, identity: { ...generated.identity, companyName: e.target.value } })}
            />
          </div>
        </div>
        <p className="text-[12.5px] text-fg-faint">
          A full playbook and guardrails have been drafted from your description — you&rsquo;ll be able to review and edit every field in the builder
          before deploying.
        </p>
        {error && <div className="rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2 text-[12.5px] text-critical">{error}</div>}
        <div className="flex items-center gap-2">
          <button type="button" className="btn-subtle" onClick={() => setPhase("form")}>
            Start over
          </button>
          <button type="button" className="btn-brand gap-1.5" disabled={submitting} onClick={createFromGenerated}>
            {submitting ? "Creating..." : "Open in Builder"}
            <ArrowRight size={15} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-pnl border border-hairline bg-sunken p-0.5">
        <button
          type="button"
          className={`rounded-pnl px-3 py-1.5 text-[13px] transition-colors ${mode === "ai" ? "bg-panel text-fg shadow-elevate-sm" : "text-fg-muted"}`}
          onClick={() => setMode("ai")}
        >
          Describe it (AI)
        </button>
        <button
          type="button"
          className={`rounded-pnl px-3 py-1.5 text-[13px] transition-colors ${mode === "manual" ? "bg-panel text-fg shadow-elevate-sm" : "text-fg-muted"}`}
          onClick={() => setMode("manual")}
        >
          Start from scratch
        </button>
      </div>

      {error && phase !== "review" && <div className="rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2 text-[12.5px] text-critical">{error}</div>}

      <AnimatePresence mode="wait">
        {mode === "ai" ? (
          <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="surface space-y-4 p-6">
            <div className="flex items-center gap-1.5 text-brand">
              <Sparkles size={14} />
              <span className="text-[12px] font-medium uppercase tracking-wide">What should your sales agent do?</span>
            </div>
            <textarea
              className="field min-h-[110px] text-[14.5px]"
              placeholder="Build an inbound sales agent for our B2B SaaS. Qualify companies with 20+ employees, answer pricing questions and book demos."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button type="button" className="btn-brand gap-1.5" disabled={prompt.trim().length < 10} onClick={handleGenerate}>
              <Wand2 size={15} />
              Generate Agent
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="manual"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onSubmit={createManual}
            className="surface space-y-4 p-6"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Agent name</label>
                <input className="field" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ava" />
              </div>
              <div>
                <label className="field-label">Company</label>
                <input className="field" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
              </div>
            </div>
            <div>
              <label className="field-label">Role</label>
              <input className="field" required value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Primary objective</label>
              <textarea
                className="field"
                rows={2}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Qualify inbound leads and book product demos."
              />
            </div>
            <button type="submit" className="btn-brand" disabled={submitting}>
              {submitting ? "Creating..." : "Create Sales Agent"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
