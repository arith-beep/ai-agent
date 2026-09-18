"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, UserCog, Wrench, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import type { ChatMessage } from "../_hooks/use-agent-chat";

function activityChips(message: ChatMessage) {
  const debug = message.debug;
  if (!debug) return null;
  const chips: { icon: typeof Search; label: string; tone: "positive" | "brand" | "critical" }[] = [];
  if (debug.retrievedChunks.length > 0) chips.push({ icon: Search, label: "Searched knowledge", tone: "brand" });
  for (const call of debug.toolCalls) {
    const failed = call.status === "error";
    if (call.name.toLowerCase().includes("handoff")) {
      chips.push({ icon: ArrowUpRight, label: failed ? "Handoff failed" : "Escalated to human", tone: failed ? "critical" : "critical" });
    } else if (call.name.toLowerCase().includes("meeting")) {
      chips.push({ icon: failed ? XCircle : CheckCircle2, label: failed ? "Meeting request failed" : "Meeting requested", tone: failed ? "critical" : "positive" });
    } else if (call.name.toLowerCase().includes("lead")) {
      chips.push({ icon: failed ? XCircle : UserCog, label: failed ? "Lead update failed" : "Lead updated", tone: failed ? "critical" : "positive" });
    } else {
      chips.push({ icon: failed ? XCircle : Wrench, label: failed ? `${call.name} failed` : call.name, tone: failed ? "critical" : "brand" });
    }
  }
  if (chips.length === 0) return null;
  const toneClass = { positive: "bg-positive-soft text-positive", brand: "bg-brand-soft text-brand", critical: "bg-critical-soft text-critical" };
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span key={i} className={`chip gap-1 ${toneClass[c.tone]}`}>
          <c.icon size={11} />
          {c.label}
        </span>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-hairline bg-panel px-3.5 py-2.5">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-fg-faint" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </div>
  );
}

export function ChatTranscript({ messages, sending, emptyHint }: { messages: ChatMessage[]; sending: boolean; emptyHint: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.length === 0 && !sending && <p className="py-10 text-center text-[13px] text-fg-faint">{emptyHint}</p>}
      {messages.map((m) => (
        <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
          <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-fg text-paper" : "rounded-bl-sm border border-hairline bg-panel text-fg"}`}>
            {m.content}
          </div>
          {m.role === "assistant" && activityChips(m)}
        </div>
      ))}
      {sending && <TypingIndicator />}
    </div>
  );
}
