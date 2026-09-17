import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { BookOpen, FileText, Globe, Type, Plus } from "lucide-react";
import { SourceStatusChip, SourceCountChip } from "./_components/source-status-chip";

const TYPE_ICON: Record<string, typeof FileText> = {
  text: Type,
  url: Globe,
  pdf: FileText,
};

export default async function SalesKnowledgePage() {
  const ctx = await requireCurrentContext();
  const [agents, sourceRows] = await Promise.all([salesRepo.listAgents(ctx.orgId), salesRepo.listAllKnowledgeSourcesForOrg(ctx.orgId)]);

  const countsByAgent = new Map<string, { total: number; ready: number; processing: number; failed: number; pending: number }>();
  for (const row of sourceRows) {
    const entry = countsByAgent.get(row.agentId) ?? { total: 0, ready: 0, processing: 0, failed: 0, pending: 0 };
    entry.total += 1;
    entry[row.source.status] += 1;
    countsByAgent.set(row.agentId, entry);
  }

  if (agents.length === 0) {
    return (
      <div>
        <div className="mb-7">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Knowledge</h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">Documents, pages and text your sales agents draw on when answering questions.</p>
        </div>
        <div className="surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
            <BookOpen size={20} strokeWidth={1.75} />
          </div>
          <div className="font-display text-[16px] font-semibold text-fg">No sales agents yet</div>
          <p className="max-w-sm text-[13.5px] text-fg-muted">
            Knowledge sources are managed per agent — create a sales agent first, then add knowledge from its builder.
          </p>
          <Link href="/sales/agents/new" className="btn-brand mt-1 gap-1.5">
            <Plus size={15} />
            Create Sales Agent
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Knowledge</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Documents, pages and text your sales agents draw on when answering questions.</p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-[13.5px] font-medium text-fg">By agent</h2>
        <div className="surface divide-y divide-hairline-soft">
          {agents.map((agent) => {
            const counts = countsByAgent.get(agent.id);
            const initial = agent.name.trim().charAt(0).toUpperCase() || "A";
            return (
              <Link
                key={agent.id}
                href={`/sales/agents/${agent.id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors duration-150 hover:bg-sunken"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pnl-lg bg-brand-soft font-display text-[14px] font-semibold text-brand">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-fg">{agent.name}</div>
                    <div className="mt-0.5 text-[12px] text-fg-faint">{counts ? `${counts.total} source${counts.total === 1 ? "" : "s"}` : "No sources yet"}</div>
                  </div>
                </div>
                {counts && counts.total > 0 && (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {counts.ready > 0 && <SourceCountChip tone="ready" count={counts.ready} label="ready" />}
                    {counts.processing > 0 && <SourceCountChip tone="processing" count={counts.processing} label="processing" />}
                    {counts.pending > 0 && <SourceCountChip tone="pending" count={counts.pending} label="pending" />}
                    {counts.failed > 0 && <SourceCountChip tone="failed" count={counts.failed} label="failed" />}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-[13.5px] font-medium text-fg">All sources</h2>
        {sourceRows.length === 0 ? (
          <div className="surface flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-fg-faint">
              <BookOpen size={18} strokeWidth={1.75} />
            </div>
            <p className="text-[13.5px] text-fg-muted">No knowledge sources added yet.</p>
            <p className="max-w-sm text-[12px] text-fg-faint">Open an agent&rsquo;s builder and add text, a URL, or a PDF from its Knowledge tab.</p>
          </div>
        ) : (
          <div className="surface divide-y divide-hairline-soft">
            {sourceRows.map(({ source, agentId, agentName }) => {
              const TypeIcon = TYPE_ICON[source.type] ?? FileText;
              return (
                <Link
                  key={source.id}
                  href={`/sales/agents/${agentId}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-sunken"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pnl bg-sunken text-fg-faint">
                      <TypeIcon size={14} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] text-fg">{source.name}</div>
                      <div className="mt-0.5 truncate text-[11.5px] text-fg-faint">
                        {source.type} · {agentName}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <SourceStatusChip status={source.status} />
                    <span className="hidden text-[11px] text-fg-faint sm:inline">{new Date(source.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
