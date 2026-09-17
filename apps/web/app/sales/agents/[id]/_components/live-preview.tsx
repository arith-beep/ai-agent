"use client";

import { useState } from "react";
import { RotateCcw, Send, Sparkles } from "lucide-react";
import { useAgentChat } from "../_hooks/use-agent-chat";
import { ChatTranscript } from "./chat-transcript";

export function LivePreview({ agentId, agentName }: { agentId: string; agentName: string }) {
  const { messages, sending, error, send, startNewSession } = useAgentChat(agentId);
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;
    void send(input.trim());
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-brand" />
          <span className="text-[13px] font-medium text-fg">Live preview</span>
        </div>
        <button type="button" onClick={() => void startNewSession()} className="flex items-center gap-1 text-[11.5px] font-medium text-fg-muted hover:text-fg">
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      <ChatTranscript messages={messages} sending={sending} emptyHint={`Say hello to see how ${agentName} responds right now.`} />

      {error && <div className="mx-4 mb-2 rounded-pnl border border-critical/30 bg-critical-soft px-3 py-2 text-[12px] text-critical">{error}</div>}

      <div className="flex gap-2 border-t border-hairline p-3">
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
        <button type="button" onClick={handleSend} disabled={sending || !input.trim()} className="btn-brand shrink-0 px-3">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
