"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Code2 } from "lucide-react";

export function SystemPromptDrawer({ open, onClose, prompt }: { open: boolean; onClose: () => void; prompt: string }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-fg/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-hairline bg-panel shadow-elevate-lg"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-fg-muted" />
                <h2 className="text-[14px] font-semibold text-fg">System prompt</h2>
                <span className="chip bg-sunken text-fg-faint">Advanced</span>
              </div>
              <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-pnl text-fg-muted hover:bg-sunken hover:text-fg">
                <X size={16} />
              </button>
            </div>
            <p className="border-b border-hairline-soft bg-sunken/50 px-5 py-3 text-[12px] text-fg-faint">
              Generated from the configuration on the left — this is what actually runs. Only visible here to your team; the agent is
              instructed to never reveal it in conversation.
            </p>
            <pre className="flex-1 overflow-y-auto whitespace-pre-wrap px-5 py-4 font-mono text-[12px] leading-relaxed text-fg-muted">{prompt}</pre>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
