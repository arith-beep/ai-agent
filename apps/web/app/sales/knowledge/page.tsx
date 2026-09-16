import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";

const SOURCE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-surface-raised text-ink-muted",
  processing: "bg-warning/15 text-warning",
  ready: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
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
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink">Knowledge</h1>
          <p className="mt-1 text-sm text-ink-muted">Documents, pages and text your sales agents draw on when answering questions.</p>
        </div>
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="text-sm font-medium text-ink">No sales agents yet</div>
          <p className="max-w-sm text-sm text-ink-muted">
            Knowledge sources are managed per agent — create a sales agent first, then add knowledge from its builder.
          </p>
          <Link href="/sales/agents/new" className="btn-primary mt-2">
            Create Sales Agent
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Knowledge</h1>
        <p className="mt-1 text-sm text-ink-muted">Documents, pages and text your sales agents draw on when answering questions.</p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-ink">By agent</h2>
        <div className="card divide-y divide-border-subtle">
          {agents.map((agent) => {
            const counts = countsByAgent.get(agent.id);
            return (
              <Link key={agent.id} href={`/sales/agents/${agent.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised">
                <div>
                  <div className="text-sm font-medium text-ink">{agent.name}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">{counts ? `${counts.total} source${counts.total === 1 ? "" : "s"}` : "No sources yet"}</div>
                </div>
                {counts && counts.total > 0 && (
                  <div className="flex items-center gap-2 text-[11px]">
                    {counts.ready > 0 && <span className="badge bg-success/15 text-success">{counts.ready} ready</span>}
                    {counts.processing > 0 && <span className="badge bg-warning/15 text-warning">{counts.processing} processing</span>}
                    {counts.pending > 0 && <span className="badge bg-surface-raised text-ink-muted">{counts.pending} pending</span>}
                    {counts.failed > 0 && <span className="badge bg-danger/15 text-danger">{counts.failed} failed</span>}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-ink">All sources</h2>
        {sourceRows.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <p className="text-sm text-ink-muted">No knowledge sources added yet.</p>
            <p className="max-w-sm text-xs text-ink-faint">Open an agent's builder and add text, a URL, or a PDF from its Knowledge tab.</p>
          </div>
        ) : (
          <div className="card divide-y divide-border-subtle">
            {sourceRows.map(({ source, agentId, agentName }) => (
              <Link key={source.id} href={`/sales/agents/${agentId}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-raised">
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{source.name}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {source.type} · {agentName}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`badge ${SOURCE_STATUS_STYLES[source.status] ?? "bg-surface-raised text-ink-muted"}`}>{source.status}</span>
                  <span className="text-[11px] text-ink-faint">{new Date(source.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
