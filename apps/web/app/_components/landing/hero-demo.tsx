"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShieldAlert, TrendingDown, TrendingUp, Sparkles } from "lucide-react";

type Phase = "generating" | "compliance" | "attention" | "strong" | "hold";

const PHASE_DURATIONS: Record<Phase, number> = {
  generating: 1100,
  compliance: 1400,
  attention: 1400,
  strong: 1400,
  hold: 1800,
};
const PHASE_ORDER: Phase[] = ["generating", "compliance", "attention", "strong", "hold"];

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const phase = PHASE_ORDER[phaseIndex] ?? "hold";

  useEffect(() => {
    if (reducedMotion) return;
    timeoutRef.current = setTimeout(() => setPhaseIndex((i) => (i + 1) % PHASE_ORDER.length), PHASE_DURATIONS[phase]);
    return () => clearTimeout(timeoutRef.current);
  }, [phase, reducedMotion]);

  const revealed = reducedMotion ? PHASE_ORDER.length - 1 : phaseIndex;
  const showGenerating = !reducedMotion && phase === "generating";
  const showCompliance = revealed >= PHASE_ORDER.indexOf("compliance");
  const showAttention = revealed >= PHASE_ORDER.indexOf("attention");
  const showStrong = revealed >= PHASE_ORDER.indexOf("strong");

  return (
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-fg-muted">
        <Sparkles size={14} className="text-brand" />
        Morning Brief
        {showGenerating && (
          <span className="ml-1">
            <TypingDots />
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-hidden">
        <AnimatePresence>
          {showCompliance && (
            <motion.div
              key="compliance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-pnl-lg border border-critical/30 bg-critical/5 p-3"
            >
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-critical">
                <ShieldAlert size={12} />
                Compliance — review before anything else
              </div>
              <p className="text-[12px] leading-relaxed text-fg-muted">
                One open case flagged for a human listen. Not auto-resolved.
              </p>
            </motion.div>
          )}
          {showAttention && (
            <motion.div
              key="attention"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-pnl-lg border border-hairline-soft bg-sunken/60 p-3"
            >
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
                <TrendingDown size={12} className="text-caution" />
                Needs a look
              </div>
              <p className="text-[12px] leading-relaxed text-fg-faint">Rep trend below their own 14-day baseline — cited with the real numbers.</p>
            </motion.div>
          )}
          {showStrong && (
            <motion.div
              key="strong"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-pnl-lg border border-hairline-soft bg-sunken/60 p-3"
            >
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted">
                <TrendingUp size={12} className="text-positive" />
                Strong week
              </div>
              <p className="text-[12px] leading-relaxed text-fg-faint">Recognition for a rep pacing well above baseline.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
