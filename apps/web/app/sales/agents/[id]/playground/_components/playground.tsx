"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, RotateCcw, Eraser, RefreshCw, Terminal, X } from "lucide-react";
import { useAgentChat } from "../../_hooks/use-agent-chat";
import { ChatTranscript } from "../../_components/chat-transcript";
import { InspectorPanel } from "./inspector-panel";

export function Playground({ agentId, agentName, modelLabel }: { agentId: string; agentName: string; modelLabel: string }) {
  const { messages, sending, error, lastDebug, send, startNewSession, clear } = useAgentChat(agentId);
  const [input, setInput] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);

  function handleSend() {
    if (!input.trim()) return;
    void send(input.trim());
    setInput("");
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] gap-0 overflow-hidden rounded-pnl-xl border border-hairline bg-panel shadow-elevate-md sm:h-[calc(100vh-9.5rem)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
          <div>
            <div className="text-[13.5px] font-medium text-fg">{agentName}</div>
            <div className="font-mono text-[11px] text-fg-faint">{modelLabel}</div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => void clear()} className="btn-subtle gap-1.5 !px-2.5 text-[12.5px]">
              <RotateCcw size={13} />
              Reset
            </button>
            <button type="button" onClick={() => void clear()} className="btn-subtle gap-1.5 !px-2.5 text-[12.5px]">
              <Eraser size={13} />
              Clear history
            </button>
            <button type="button" onClick={() => void startNewSession()} className="btn-outline gap-1.5 !py-1.5 text-[12.5px]">
              <RefreshCw size={13} />
              New test session
            </button>
            <button
              type="button"
              onClick={() => setInspectorOpen((v) => !v)}
              className={`btn-outline gap-1.5 !py-1.5 text-[12.5px] ${inspectorOpen ? "border-brand bg-brand-soft text-brand" : ""}`}
            >
              <Terminal size={13} />
              Inspector
            </button>
          </div>
        </div>

        <ChatTranscript messages={messages} sending={sending} emptyHint="Say hello to start testing this agent." />

        {error && <div className="mx-4 mb-2 rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2 text-[12.5px] text-critical">{error}</div>}

        <div className="flex gap-2 border-t border-hairline p-3.5">
          <input
            className="field"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button type="button" className="btn-brand shrink-0 px-4" onClick={handleSend} disabled={sending || !input.trim()}>
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Desktop: slide-in side panel */}
      <AnimatePresence initial={false}>
        {inspectorOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="hidden shrink-0 overflow-hidden border-l border-hairline bg-sunken/40 lg:flex lg:flex-col"
          >
            <div className="flex w-[340px] items-center justify-between border-b border-hairline px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
                <Terminal size={13} />
                Developer inspector
              </div>
              <button type="button" onClick={() => setInspectorOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-pnl text-fg-faint hover:bg-sunken hover:text-fg">
                <X size={14} />
              </button>
            </div>
            <div className="h-[calc(100%-49px)] w-[340px]">
              <InspectorPanel debug={lastDebug} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile/tablet: full-screen bottom sheet */}
      <AnimatePresence>
        {inspectorOpen && (
          <div className="lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-fg/30"
              onClick={() => setInspectorOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-pnl-xl border-t border-hairline bg-panel shadow-elevate-lg"
            >
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg">
                  <Terminal size={13} />
                  Developer inspector
                </div>
                <button type="button" onClick={() => setInspectorOpen(false)} className="flex h-6 w-6 items-center justify-center rounded-pnl text-fg-faint hover:bg-sunken hover:text-fg">
                  <X size={14} />
                </button>
              </div>
              <InspectorPanel debug={lastDebug} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
