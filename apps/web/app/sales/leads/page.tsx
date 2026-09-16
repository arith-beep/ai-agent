import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { LeadStatusBadge } from "../_components/status-badge";
import { LeadsFilterBar } from "./_components/leads-filter-bar";

const SINCE_DAYS: Record<string, number> = { "7": 7, "30": 30, "90": 90 };

export default async function SalesLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; agentId?: string; since?: string }>;
}) {
  const ctx = await requireCurrentContext();
  const { status, agentId, since } = await searchParams;

  const days = since ? SINCE_DAYS[since] : undefined;
  const sinceDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;

  const [rows, agents] = await Promise.all([
    salesRepo.listLeads(ctx.orgId, { status: status || undefined, agentId: agentId || undefined, since: sinceDate }),
    salesRepo.listAgents(ctx.orgId),
  ]);

  const hasFilters = Boolean(status || agentId || since);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Leads</h1>
          <p className="mt-1 text-sm text-ink-muted">Every contact your sales agents have captured, across all conversations.</p>
        </div>
      </div>

      <LeadsFilterBar agents={agents.map((a) => ({ id: a.id, name: a.name }))} />

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="text-sm font-medium text-ink">{hasFilters ? "No leads match these filters" : "No leads yet"}</div>
          <p className="max-w-sm text-sm text-ink-muted">
            {hasFilters
              ? "Try widening your filters to see more leads."
              : "Leads appear here automatically once a sales agent captures contact information in a conversation."}
          </p>
          {!hasFilters && (
            <Link href="/sales/agents" className="btn-primary mt-2">
              View Sales Agents
            </Link>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-border-subtle">
          {rows.map(({ lead, agentName }) => (
            <Link key={lead.id} href={`/sales/leads/${lead.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-raised">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{lead.name ?? lead.email ?? "Unnamed lead"}</span>
                  <LeadStatusBadge status={lead.status} />
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-muted">
                  {lead.email ?? "No email"}
                  {lead.company ? ` · ${lead.company}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-ink-faint">
                <span>{agentName ?? "Unassigned"}</span>
                <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
