import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { ConversationsShell, type ConversationListItem } from "./_components/conversations-shell";

export default async function ConversationsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCurrentContext();
  const [rows, agents] = await Promise.all([
    salesRepo.listConversations(ctx.orgId, { excludeTest: true }),
    salesRepo.listAgents(ctx.orgId),
  ]);

  const items: ConversationListItem[] = rows.map((row) => ({
    id: row.conversation.id,
    leadName: row.leadName,
    leadEmail: row.leadEmail,
    agentId: row.conversation.agentId,
    agentName: row.agentName,
    status: row.conversation.status,
    leadStatus: row.leadStatus,
    lastMessageAt: row.conversation.lastMessageAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Conversations</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Live and past conversations between your sales agents and visitors.</p>
      </div>
      <ConversationsShell items={items} agents={agents.map((a) => ({ id: a.id, name: a.name }))}>
        {children}
      </ConversationsShell>
    </div>
  );
}
