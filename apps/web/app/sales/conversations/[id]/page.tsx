import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { LeadStatusBadge, ConversationStatusBadge } from "../../_components/status-badge";
import { ResolveHandoffButton } from "./_components/resolve-handoff-button";

interface ToolCallDebug {
  name: string;
  status: "success" | "error";
  durationMs: number;
  errorMessage?: string;
}

function extractToolCalls(debug: Record<string, unknown> | null | undefined): ToolCallDebug[] {
  if (!debug || !Array.isArray(debug.toolCalls)) return [];
  return (debug.toolCalls as unknown[]).filter(
    (c): c is ToolCallDebug => typeof c === "object" && c !== null && typeof (c as Record<string, unknown>).name === "string",
  );
}

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const conversation = await salesRepo.getConversation(ctx.orgId, id);
  if (!conversation) notFound();

  const [agent, messages, lead, handoff] = await Promise.all([
    salesRepo.getAgentById(ctx.orgId, conversation.agentId),
    salesRepo.listMessages(id),
    conversation.leadId ? salesRepo.getLead(ctx.orgId, conversation.leadId) : Promise.resolve(null),
    conversation.status === "handoff" ? salesRepo.getHandoffForConversation(ctx.orgId, id) : Promise.resolve(null),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/sales/conversations" className="text-xs text-ink-faint hover:text-ink-muted">
            ← All conversations
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{lead?.name ?? lead?.email ?? "Anonymous visitor"}</h1>
            <ConversationStatusBadge status={conversation.status} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            with{" "}
            {agent ? (
              <Link href={`/sales/agents/${agent.id}`} className="text-accent hover:underline">
                {agent.name}
              </Link>
            ) : (
              "an agent"
            )}{" "}
            · {conversation.channel}
          </p>
        </div>
        {conversation.status === "handoff" && handoff && handoff.status !== "resolved" && (
          <ResolveHandoffButton handoffId={handoff.id} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="card flex flex-col p-0">
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-ink">Transcript</div>
          <div className="space-y-3 px-4 py-4">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-faint">No messages in this conversation yet.</p>
            ) : (
              messages.map((m) => {
                if (m.role === "system") {
                  return (
                    <div key={m.id} className="text-center text-[11px] text-ink-faint">
                      {m.content}
                    </div>
                  );
                }
                const toolCalls = m.role === "assistant" ? extractToolCalls(m.debug) : [];
                return (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[75%]">
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          m.role === "user" ? "bg-accent text-white" : "bg-surface-raised text-ink"
                        }`}
                      >
                        {m.content}
                      </div>
                      {toolCalls.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {toolCalls.map((call, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                              <span className={`badge ${call.status === "success" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
                                {call.status}
                              </span>
                              <span className="font-mono">{call.name}</span>
                              <span>· {call.durationMs}ms</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className={`mt-1 text-[11px] text-ink-faint ${m.role === "user" ? "text-right" : ""}`}>
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-2 text-xs font-medium text-ink-muted">Lead</div>
            {lead ? (
              <div className="space-y-1">
                <Link href={`/sales/leads/${lead.id}`} className="text-sm text-accent hover:underline">
                  {lead.name ?? lead.email ?? "Unnamed lead"}
                </Link>
                <div>
                  <LeadStatusBadge status={lead.status} />
                </div>
                {lead.statusReason && <div className="text-[11px] text-ink-faint">{lead.statusReason}</div>}
              </div>
            ) : (
              <p className="text-xs text-ink-faint">No lead captured in this conversation yet.</p>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-2 text-xs font-medium text-ink-muted">Metadata</div>
            <div className="space-y-1.5 text-xs text-ink-muted">
              <div>Started {new Date(conversation.startedAt).toLocaleString()}</div>
              <div>Last message {new Date(conversation.lastMessageAt).toLocaleString()}</div>
              <div>Channel: {conversation.channel}</div>
              <div>Test conversation: {conversation.isTest ? "Yes" : "No"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
