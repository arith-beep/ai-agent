import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { runsRepo, policyRepo, workflowsRepo } from "@ai-agent/storage";

export default async function AnalyticsPage() {
  const ctx = await requireCurrentContext();
  const [runs, pendingApprovals, activeWorkflowRuns, recentWorkflowRuns] = await Promise.all([
    runsRepo.listRunsForOrg(ctx.orgId, 500),
    policyRepo.listPendingApprovals(ctx.orgId),
    workflowsRepo.listWorkflowRunsForOrg(ctx.orgId, { statuses: ["running", "suspended", "queued"], limit: 200 }),
    workflowsRepo.listWorkflowRunsForOrg(ctx.orgId, { limit: 200 }),
  ]);

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

  const recentFailedAgentRuns = runs
    .filter(({ run }) => run.status === "failed")
    .slice(0, 10)
    .map(({ run, agentName }) => ({
      id: run.id,
      label: `Agent: ${agentName}`,
      href: `/runs/${run.id}`,
      message: run.errorMessage ?? "Unknown error",
      at: run.startedAt,
    }));

  const recentFailedWorkflowRuns = recentWorkflowRuns
    .filter(({ run }) => run.status === "failed")
    .slice(0, 10)
    .map(({ run, workflowId, workflowName }) => ({
      id: run.id,
      label: `Workflow: ${workflowName}`,
      href: `/workflows/${workflowId}/runs/${run.id}`,
      message: run.errorMessage ?? "Unknown error",
      at: run.startedAt,
    }));

  const recentFailures = [...recentFailedAgentRuns, ...recentFailedWorkflowRuns]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

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

      <div className="grid grid-cols-2 gap-4">
        <Link href="/approvals" className="card p-4 transition hover:bg-surface-raised">
          <div className="text-xs text-ink-faint">Pending approvals</div>
          <div className={`mt-1 text-xl font-semibold ${pendingApprovals.length > 0 ? "text-warning" : "text-ink"}`}>{pendingApprovals.length}</div>
        </Link>
        <Link href="/workflows" className="card p-4 transition hover:bg-surface-raised">
          <div className="text-xs text-ink-faint">Active workflow runs</div>
          <div className="mt-1 text-xl font-semibold text-ink">{activeWorkflowRuns.length}</div>
        </Link>
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Recent failures</div>
        <div className="divide-y divide-border-subtle">
          {recentFailures.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No failures among recent runs.</div>}
          {recentFailures.map((failure) => (
            <Link key={failure.id} href={failure.href} className="block px-5 py-3 text-sm hover:bg-surface-raised">
              <div className="flex items-center justify-between">
                <span className="text-ink">{failure.label}</span>
                <span className="text-xs text-ink-faint">{new Date(failure.at).toLocaleString()}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-danger" title={failure.message}>
                {failure.message}
              </div>
            </Link>
          ))}
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
