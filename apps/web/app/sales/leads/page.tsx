import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { Users } from "lucide-react";
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
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Leads</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Every contact your sales agents have captured, across all conversations.</p>
      </div>

      <LeadsFilterBar agents={agents.map((a) => ({ id: a.id, name: a.name }))} />

      {rows.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Users size={20} strokeWidth={1.75} />
          </div>
          <div className="font-display text-[16px] font-semibold text-fg">{hasFilters ? "No leads match these filters" : "No leads yet"}</div>
          <p className="max-w-sm text-[13.5px] text-fg-muted">
            {hasFilters
              ? "Try widening your filters to see more leads."
              : "Leads appear here automatically once a sales agent captures contact information in a conversation."}
          </p>
          {!hasFilters && (
            <Link href="/sales/agents" className="btn-outline mt-1">
              View Sales Agents
            </Link>
          )}
        </div>
      ) : (
        <div className="surface divide-y divide-hairline-soft">
          {rows.map(({ lead, agentName }) => {
            const displayName = lead.name ?? lead.email ?? "Unnamed lead";
            const initial = displayName.trim().charAt(0).toUpperCase() || "?";
            return (
              <Link
                key={lead.id}
                href={`/sales/leads/${lead.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-sunken"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-[13px] font-semibold text-brand">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-fg">{displayName}</span>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-fg-faint">
                      {lead.email ?? "No email"}
                      {lead.company ? ` · ${lead.company}` : ""}
                    </div>
                  </div>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-0.5 text-[11.5px] text-fg-faint sm:flex">
                  <span>{agentName ?? "Unassigned"}</span>
                  <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
