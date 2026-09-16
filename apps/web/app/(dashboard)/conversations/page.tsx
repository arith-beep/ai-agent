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

function summarize(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.summary === "string") return record.summary;
    if (typeof record.question === "string") return record.question;
    if (typeof record.title === "string") return record.title;
  }
  return JSON.stringify(payload);
}

export default async function ConversationsPage() {
  const ctx = await requireCurrentContext();
  const [conversations, agents, members] = await Promise.all([
    messagingRepo.listConversationsForOrg(ctx.orgId, 100),
    agentsRepo.listAgents(ctx.orgId),
    tenancyRepo.listOrgMembers(ctx.orgId),
  ]);
  const agentNameById = new Map(agents.map((a) => [a.id, a.name]));
  const memberNameById = new Map(members.map((m) => [m.userId, m.name ?? m.email]));

  function nameFor(type: string, id: string): string {
    if (type === "agent") return agentNameById.get(id) ?? "Unknown agent";
    return id === ctx.userId ? "You" : memberNameById.get(id) ?? "A teammate";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Conversations</h1>
        <p className="mt-1 text-sm text-ink-muted">Every thread flowing through the message bus — agent↔agent and agent↔human.</p>
      </div>

      <div className="card divide-y divide-border-subtle">
        {conversations.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No conversations yet.</div>}
        {conversations.map(({ conversation, participants, messageCount, latestMessage }) => {
          const names = participants.map((p) => nameFor(p.participantType, p.participantId));
          return (
            <Link key={conversation.id} href={`/conversations/${conversation.id}`} className="block px-5 py-4 hover:bg-surface-raised">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{names.join(" ↔ ")}</span>
                  <span className="badge bg-surface-raised text-ink-muted">{conversation.type === "agent_agent" ? "agent ↔ agent" : "agent ↔ human"}</span>
                  {latestMessage && <span className={`badge ${KIND_STYLES[latestMessage.kind] ?? "bg-surface-raised text-ink-muted"}`}>{latestMessage.kind}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-faint">
                  <span>{messageCount} message{messageCount === 1 ? "" : "s"}</span>
                  <span>{latestMessage ? new Date(latestMessage.createdAt).toLocaleString() : new Date(conversation.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {latestMessage && <p className="mt-1 truncate text-xs text-ink-muted">{summarize(latestMessage.payload)}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
