import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { LeadStatusBadge, ConversationStatusBadge } from "../_components/status-badge";
import { ConversationsFilterBar } from "./_components/conversations-filter-bar";

export default async function SalesConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; agentId?: string }>;
}) {
  const ctx = await requireCurrentContext();
  const { status, agentId } = await searchParams;

  const [rows, agents] = await Promise.all([
    salesRepo.listConversations(ctx.orgId, { status: status || undefined, agentId: agentId || undefined, excludeTest: true }),
    salesRepo.listAgents(ctx.orgId),
  ]);

  const hasFilters = Boolean(status || agentId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Conversations</h1>
        <p className="mt-1 text-sm text-ink-muted">Live and past conversations between your sales agents and visitors.</p>
      </div>

      <ConversationsFilterBar agents={agents.map((a) => ({ id: a.id, name: a.name }))} />

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="text-sm font-medium text-ink">{hasFilters ? "No conversations match these filters" : "No conversations yet"}</div>
          <p className="max-w-sm text-sm text-ink-muted">
            {hasFilters
              ? "Try widening your filters to see more conversations."
              : "Once your sales agents start talking to visitors, real (non-test) conversations will show up here."}
          </p>
          {!hasFilters && (
            <Link href="/sales/agents" className="btn-primary mt-2">
              View Sales Agents
            </Link>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-border-subtle">
          {rows.map((row) => (
            <Link
              key={row.conversation.id}
              href={`/sales/conversations/${row.conversation.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-raised"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{row.leadName ?? row.leadEmail ?? "Anonymous visitor"}</span>
                  <ConversationStatusBadge status={row.conversation.status} />
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">with {row.agentName}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {row.leadStatus ? <LeadStatusBadge status={row.leadStatus} /> : null}
                <span className="text-xs text-ink-faint">{new Date(row.conversation.lastMessageAt).toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
