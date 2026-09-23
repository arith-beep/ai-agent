"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  debug?: TurnDebug;
}
export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
}
export interface ToolCallDebug {
  name: string;
  input: unknown;
  output?: unknown;
  status: "success" | "error";
  errorMessage?: string;
  durationMs: number;
}
export interface LeadSnapshot {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  statusReason: string | null;
}
export interface TurnDebug {
  retrievedChunks: RetrievedChunk[];
  toolCalls: ToolCallDebug[];
  latencyMs: number;
  model: string;
  error?: string;
  lead: LeadSnapshot | null;
}

export function useAgentChat(agentId: string) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDebug, setLastDebug] = useState<TurnDebug | null>(null);
  const startingRef = useRef(false);

  const startNewSession = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setMessages([]);
    setLastDebug(null);
    setError(null);
    try {
      const res = await fetch(`/api/sales/agents/${agentId}/playground`, { method: "POST" });
      const data = await res.json();
      setConversationId(data.conversation?.id ?? null);
    } finally {
      startingRef.current = false;
    }
  }, [agentId]);

  useEffect(() => {
    void startNewSession();
  }, [startNewSession]);

  const clear = useCallback(async () => {
    if (!conversationId) return;
    await fetch(`/api/sales/conversations/${conversationId}/messages`, { method: "DELETE" });
    setMessages([]);
    setLastDebug(null);
    setError(null);
  }, [conversationId]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || !conversationId || sending) return;
      setSending(true);
      setError(null);
      setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: text }]);
      try {
        const res = await fetch(`/api/sales/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to send message.");
        setMessages((m) => [...m, { id: `local-${Date.now()}-a`, role: "assistant", content: data.assistantText, debug: data.debug }]);
        setLastDebug(data.debug ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message.");
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending],
  );

  return { conversationId, messages, sending, error, lastDebug, send, startNewSession, clear };
}
