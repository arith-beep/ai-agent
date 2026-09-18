"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { UserRound, Check } from "lucide-react";

const PIPELINE = ["Lead identified", "Qualified", "Meeting requested", "CRM updated"] as const;

type Phase = "visitor-typing" | "visitor-said" | "agent-typing" | "agent-said" | "pipeline" | "hold";

const PHASE_DURATIONS: Record<Phase, number> = {
  "visitor-typing": 900,
  "visitor-said": 700,
  "agent-typing": 1000,
  "agent-said": 900,
  pipeline: PIPELINE.length * 550 + 600,
  hold: 1600,
};
const PHASE_ORDER: Phase[] = ["visitor-typing", "visitor-said", "agent-typing", "agent-said", "pipeline", "hold"];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-fg-faint"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

export function HeroDemo() {
  const reducedMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(-1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const phase = PHASE_ORDER[phaseIndex] ?? "hold";

  useEffect(() => {
    if (reducedMotion) return;
    if (phase === "pipeline") {
      let step = -1;
      const interval = setInterval(() => {
        step += 1;
        setPipelineStep(step);
        if (step >= PIPELINE.length - 1) clearInterval(interval);
      }, 550);
      timeoutRef.current = setTimeout(() => setPhaseIndex((i) => (i + 1) % PHASE_ORDER.length), PHASE_DURATIONS.pipeline);
      return () => {
        clearInterval(interval);
        clearTimeout(timeoutRef.current);
      };
    }
    timeoutRef.current = setTimeout(() => {
      setPhaseIndex((i) => (i + 1) % PHASE_ORDER.length);
      if (phase === "hold") setPipelineStep(-1);
    }, PHASE_DURATIONS[phase]);
    return () => clearTimeout(timeoutRef.current);
  }, [phase, reducedMotion]);

  const showVisitor = reducedMotion || phaseIndex >= PHASE_ORDER.indexOf("visitor-said");
  const showAgentTyping = !reducedMotion && phase === "agent-typing";
  const showAgent = reducedMotion || phaseIndex >= PHASE_ORDER.indexOf("agent-said");
  const showVisitorTyping = !reducedMotion && phase === "visitor-typing";
  const activePipelineStep = reducedMotion ? PIPELINE.length - 1 : pipelineStep;
  const showPipeline = reducedMotion || phaseIndex >= PHASE_ORDER.indexOf("pipeline");

  return (
    <div className="flex h-full flex-col justify-between gap-5 p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-brand-on">N</span>
        Nova · online
      </div>

      <div className="flex-1 space-y-3">
        <AnimatePresence>
          {showVisitorTyping && (
            <motion.div key="visitor-typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-end">
              <div className="rounded-2xl rounded-br-sm bg-sunken px-3.5 py-2.5"><TypingDots /></div>
            </motion.div>
          )}
          {showVisitor && (
            <motion.div key="visitor-said" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-fg px-3.5 py-2.5 text-[13px] leading-snug text-paper">
                We&rsquo;re looking for a solution for our 40-person sales team.
              </div>
            </motion.div>
          )}
          {showAgentTyping && (
            <motion.div key="agent-typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-hairline bg-panel px-3.5 py-2.5"><TypingDots /></div>
            </motion.div>
          )}
          {showAgent && (
            <motion.div key="agent-said" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-hairline bg-panel px-3.5 py-2.5 text-[13px] leading-snug text-fg">
                Got it. What&rsquo;s the biggest bottleneck in your current sales process?
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPipeline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-pnl-lg border border-hairline-soft bg-sunken p-3.5"
          >
            <div className="flex items-center">
              {PIPELINE.map((step, i) => (
                <div key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-300 ${
                        i <= activePipelineStep ? "border-positive bg-positive text-paper" : "border-hairline bg-panel text-fg-faint"
                      }`}
                    >
                      {i <= activePipelineStep ? (
                        <Check size={12} strokeWidth={2.5} />
                      ) : (
                        <UserRound size={11} strokeWidth={2} className="opacity-0" />
                      )}
                    </div>
                    <span className={`whitespace-nowrap text-center text-[10.5px] font-medium ${i <= activePipelineStep ? "text-fg" : "text-fg-faint"}`}>
                      {step}
                    </span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="mx-1.5 h-px flex-1 -translate-y-2.5 bg-hairline">
                      <div
                        className="h-px bg-positive transition-all duration-300 ease-premium"
                        style={{ width: i < activePipelineStep ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
