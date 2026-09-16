import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { messagingRepo, agentsRepo, tenancyRepo } from "@ai-agent/storage";

const KIND_STYLES: Record<string, string> = {
  notification: "bg-accent/15 text-accent",
  query: "bg-warning/15 text-warning",
  response: "bg-success/15 text-success",
  event: "bg-ink-faint/15 text-ink-faint",
  task: "bg-warning/15 text-warning",
};

const STATUS_STYLES: Record<string, string> = {
  processed: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  pending: "bg-ink-faint/15 text-ink-faint",
  delivered: "bg-accent/15 text-accent",
  processing: "bg-accent/15 text-accent",
};

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const conversation = await messagingRepo.getConversation(id);
  if (!conversation || conversation.orgId !== ctx.orgId) notFound();

  const [participants, messages, agents, members] = await Promise.all([
    messagingRepo.getConversationParticipants(id),
    messagingRepo.listMessagesForConversation(id),
    agentsRepo.listAgents(ctx.orgId),
    tenancyRepo.listOrgMembers(ctx.orgId),
  ]);
  const agentNameById = new Map(agents.map((a) => [a.id, a.name]));
  const memberNameById = new Map(members.map((m) => [m.userId, m.name ?? m.email]));

  function nameFor(type: string, participantId: string): string {
    if (type === "agent") return agentNameById.get(participantId) ?? "Unknown agent";
    return participantId === ctx.userId ? "You" : memberNameById.get(participantId) ?? "A teammate";
  }

  const participantNames = participants.map((p) => nameFor(p.participantType, p.participantId));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/conversations" className="text-xs text-ink-faint hover:text-ink">
          ← Conversations
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-ink">{participantNames.join(" ↔ ")}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {conversation.type === "agent_agent" ? "Agent ↔ agent" : "Agent ↔ human"} · {messages.length} message{messages.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-3">
        {messages.length === 0 && <div className="card p-6 text-center text-sm text-ink-faint">No messages in this conversation.</div>}
        {messages.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-ink">{nameFor(m.fromType, m.fromId)}</span>
                <span className="text-ink-faint">→</span>
                <span className="font-medium text-ink">{nameFor(m.toType, m.toId)}</span>
                <span className={`badge ${KIND_STYLES[m.kind] ?? "bg-surface-raised text-ink-muted"}`}>{m.kind}</span>
                <span className={`badge ${STATUS_STYLES[m.status] ?? "bg-surface-raised text-ink-muted"}`}>{m.status}</span>
                {m.priority !== "normal" && <span className="badge bg-danger/15 text-danger">{m.priority}</span>}
              </div>
              <span className="text-xs text-ink-faint">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-canvas p-2 font-mono text-[11px] text-ink-muted">{JSON.stringify(m.payload, null, 2)}</pre>
            {m.errorMessage && <p className="mt-1 text-xs text-danger">{m.errorMessage}</p>}
            {m.correlationId && <p className="mt-1 text-xs text-ink-faint">correlates to {m.correlationId}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
