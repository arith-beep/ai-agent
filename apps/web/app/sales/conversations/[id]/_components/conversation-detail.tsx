"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Info, X } from "lucide-react";
import { ConversationStatusBadge } from "../../../_components/status-badge";
import { ChatTranscript } from "../../../agents/[id]/_components/chat-transcript";
import type { ChatMessage } from "../../../agents/[id]/_hooks/use-agent-chat";
import { ResolveHandoffButton } from "./resolve-handoff-button";
import { LeadIntelContent, type LeadIntelData, type MeetingData } from "./lead-intelligence";

export function ConversationDetail({
  conversationStatus,
  channel,
  leadDisplayName,
  agentId,
  agentName,
  messages,
  lead,
  meeting,
  handoffId,
  showResolveHandoff,
}: {
  conversationStatus: string;
  channel: string;
  leadDisplayName: string;
  agentId: string | null;
  agentName: string | null;
  messages: ChatMessage[];
  lead: LeadIntelData | null;
  meeting: MeetingData | null;
  handoffId: string | null;
  showResolveHandoff: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/sales/conversations" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pnl text-fg-faint hover:bg-sunken md:hidden">
            <ChevronLeft size={16} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13.5px] font-medium text-fg">{leadDisplayName}</span>
              <ConversationStatusBadge status={conversationStatus} />
            </div>
            <div className="truncate text-[12px] text-fg-muted">
              with{" "}
              {agentId && agentName ? (
                <Link href={`/sales/agents/${agentId}`} className="text-brand hover:underline">
                  {agentName}
                </Link>
              ) : (
                "an agent"
              )}{" "}
              · {channel}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-pnl border border-hairline px-2.5 py-1.5 text-[12px] text-fg-muted hover:bg-sunken lg:hidden"
          >
            <Info size={13} />
            Lead
          </button>
          {showResolveHandoff && handoffId && <ResolveHandoffButton handoffId={handoffId} />}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatTranscript messages={messages} sending={false} emptyHint="No messages in this conversation yet." />
        </div>
        <div className="hidden w-[280px] shrink-0 flex-col overflow-y-auto border-l border-hairline lg:flex">
          <div className="border-b border-hairline px-4 py-3.5 text-[12.5px] font-medium text-fg">Lead intelligence</div>
          <LeadIntelContent lead={lead} meeting={meeting} />
        </div>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-fg/30 lg:hidden"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-pnl-xl border-t border-hairline bg-panel shadow-elevate-lg lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3.5">
                <span className="text-[13px] font-medium text-fg">Lead intelligence</span>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-pnl text-fg-faint hover:bg-sunken"
                >
                  <X size={14} />
                </button>
              </div>
              <LeadIntelContent lead={lead} meeting={meeting} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
