import { requireCurrentContext } from "@/lib/session";
import { runsRepo } from "@ai-agent/storage";

export default async function AnalyticsPage() {
  const ctx = await requireCurrentContext();
  const runs = await runsRepo.listRunsForOrg(ctx.orgId, 500);

  const byStatus: Record<string, number> = {};
  let totalCost = 0;
  let totalTokens = 0;
  const byAgent = new Map<string, { count: number; cost: number }>();

  for (const { run, agentName } of runs) {
    byStatus[run.status] = (byStatus[run.status] ?? 0) + 1;
    totalCost += Number(run.estimatedCost ?? 0);
    totalTokens += run.tokenUsage?.totalTokens ?? 0;
    const entry = byAgent.get(agentName) ?? { count: 0, cost: 0 };
    entry.count += 1;
    entry.cost += Number(run.estimatedCost ?? 0);
    byAgent.set(agentName, entry);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">Aggregated from the last {runs.length} runs. Deeper analytics (trends, per-department views) land in a later milestone.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Total runs</div>
          <div className="mt-1 text-xl font-semibold text-ink">{runs.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Total tokens</div>
          <div className="mt-1 text-xl font-semibold text-ink">{totalTokens.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Total est. cost</div>
          <div className="mt-1 text-xl font-semibold text-ink">${totalCost.toFixed(4)}</div>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Runs by status</div>
        <div className="divide-y divide-border-subtle">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-ink">{status}</span>
              <span className="text-ink-muted">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Cost by agent</div>
        <div className="divide-y divide-border-subtle">
          {[...byAgent.entries()].map(([name, stats]) => (
            <div key={name} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-ink">{name}</span>
              <span className="text-ink-muted">
                {stats.count} runs · ${stats.cost.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
