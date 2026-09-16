import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { runsRepo, policyRepo, workflowsRepo, toolsRepo } from "@ai-agent/storage";
import { StackedBarChart, type DayBucket } from "./_components/stacked-bar-chart";
import { RateBar } from "./_components/rate-bar";

const RANGES = [7, 14, 30] as const;

function buildDayBuckets(byDay: { day: string; status: string; count: number }[], days: number): DayBucket[] {
  const byDate = new Map<string, Record<string, number>>();
  for (const row of byDay) {
    const entry = byDate.get(row.day) ?? {};
    entry[row.status] = row.count;
    byDate.set(row.day, entry);
  }
  const buckets: DayBucket[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const statuses = byDate.get(key) ?? {};
    const segments = Object.entries(statuses).map(([status, count]) => ({ status, count }));
    buckets.push({ day: key, total: segments.reduce((sum, s) => sum + s.count, 0), segments });
  }
  return buckets;
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const ctx = await requireCurrentContext();
  const { range: rangeParam } = await searchParams;
  const range = RANGES.includes(Number(rangeParam) as (typeof RANGES)[number]) ? Number(rangeParam) : 14;
  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000);

  const [agentStats, workflowStats, toolStats, pendingApprovals, activeWorkflowRuns, recentAgentRuns, recentWorkflowRuns] = await Promise.all([
    runsRepo.getAgentRunStatsForOrg(ctx.orgId, since),
    workflowsRepo.getWorkflowRunStatsForOrg(ctx.orgId, since),
    toolsRepo.getToolUsageStatsForOrg(ctx.orgId),
    policyRepo.listPendingApprovals(ctx.orgId),
    workflowsRepo.listWorkflowRunsForOrg(ctx.orgId, { statuses: ["running", "suspended", "queued"], limit: 200 }),
    runsRepo.listRunsForOrg(ctx.orgId, 200),
    workflowsRepo.listWorkflowRunsForOrg(ctx.orgId, { limit: 200 }),
  ]);

  const agentCompleted = agentStats.byStatus.find((s) => s.status === "completed")?.count ?? 0;
  const agentFailed = agentStats.byStatus.find((s) => s.status === "failed")?.count ?? 0;
  const agentSuccessRate = agentCompleted + agentFailed > 0 ? (agentCompleted / (agentCompleted + agentFailed)) * 100 : null;

  const agentDayBuckets = buildDayBuckets(agentStats.byDay, range);
  const workflowDayBuckets = buildDayBuckets(workflowStats.byDay, range);

  const recentFailures = [
    ...recentAgentRuns
      .filter(({ run }) => run.status === "failed")
      .map(({ run, agentName }) => ({ id: run.id, label: `Agent: ${agentName}`, href: `/runs/${run.id}`, message: run.errorMessage ?? "Unknown error", at: run.startedAt })),
    ...recentWorkflowRuns
      .filter(({ run }) => run.status === "failed")
      .map(({ run, workflowId, workflowName }) => ({
        id: run.id,
        label: `Workflow: ${workflowName}`,
        href: `/workflows/${workflowId}/runs/${run.id}`,
        message: run.errorMessage ?? "Unknown error",
        at: run.startedAt,
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-muted">Real aggregates over your runs, tool calls, and workflows — no synthesized data.</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border-subtle p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/analytics?range=${r}`}
              className={`rounded px-2.5 py-1 text-xs ${r === range ? "bg-surface-raised text-ink" : "text-ink-muted hover:text-ink"}`}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Agent runs</div>
          <div className="mt-1 text-xl font-semibold text-ink">{agentStats.totals.count}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Success rate</div>
          <div className={`mt-1 text-xl font-semibold ${agentSuccessRate !== null && agentSuccessRate < 80 ? "text-danger" : "text-ink"}`}>
            {agentSuccessRate !== null ? `${agentSuccessRate.toFixed(0)}%` : "—"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Avg latency</div>
          <div className="mt-1 text-xl font-semibold text-ink">{formatMs(agentStats.totals.avgDurationMs)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Est. cost</div>
          <div className="mt-1 text-xl font-semibold text-ink">${agentStats.totals.totalCost.toFixed(4)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Tokens used</div>
          <div className="mt-1 text-xl font-semibold text-ink">{agentStats.totals.totalTokens.toLocaleString()}</div>
        </div>
        <Link href="/approvals" className="card p-4 transition hover:bg-surface-raised">
          <div className="text-xs text-ink-faint">Pending approvals</div>
          <div className={`mt-1 text-xl font-semibold ${pendingApprovals.length > 0 ? "text-warning" : "text-ink"}`}>{pendingApprovals.length}</div>
        </Link>
        <Link href="/workflows/runs" className="card p-4 transition hover:bg-surface-raised">
          <div className="text-xs text-ink-faint">Active workflow runs</div>
          <div className="mt-1 text-xl font-semibold text-ink">{activeWorkflowRuns.length}</div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StackedBarChart title="Agent runs" data={agentDayBuckets} />
        <StackedBarChart title="Workflow runs" data={workflowDayBuckets} />
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
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Cost &amp; tokens by model</div>
        {agentStats.byModel.length === 0 ? (
          <div className="px-5 py-6 text-sm text-ink-faint">No agent runs in this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-ink-faint">
                <th className="px-5 py-2 font-normal">Model</th>
                <th className="px-5 py-2 font-normal">Runs</th>
                <th className="px-5 py-2 font-normal">Tokens</th>
                <th className="px-5 py-2 font-normal">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {agentStats.byModel.map((m) => (
                <tr key={`${m.provider}/${m.model}`}>
                  <td className="px-5 py-2.5 text-ink">
                    {m.provider}/{m.model}
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted">{m.count}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{m.totalTokens.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-ink-muted">${m.totalCost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Tool usage</div>
        {toolStats.length === 0 ? (
          <div className="px-5 py-6 text-sm text-ink-faint">No tool calls yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-ink-faint">
                <th className="px-5 py-2 font-normal">Tool</th>
                <th className="px-5 py-2 font-normal">Calls</th>
                <th className="px-5 py-2 font-normal">Success rate</th>
                <th className="px-5 py-2 font-normal">Avg latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {toolStats.map((t) => (
                <tr key={t.toolId}>
                  <td className="px-5 py-2.5">
                    <Link href={`/tools/${t.toolId}`} className="text-ink hover:text-accent">
                      {t.toolName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted">{t.totalCalls}</td>
                  <td className="px-5 py-2.5">
                    <RateBar success={t.successCalls} error={t.errorCalls} />
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted">{formatMs(t.avgDurationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Workflow success rate</div>
        {workflowStats.byWorkflow.length === 0 ? (
          <div className="px-5 py-6 text-sm text-ink-faint">No workflow runs in this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-ink-faint">
                <th className="px-5 py-2 font-normal">Workflow</th>
                <th className="px-5 py-2 font-normal">Runs</th>
                <th className="px-5 py-2 font-normal">Success rate</th>
                <th className="px-5 py-2 font-normal">Avg duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {workflowStats.byWorkflow.map((w) => (
                <tr key={w.workflowId}>
                  <td className="px-5 py-2.5">
                    <Link href={`/workflows/${w.workflowId}`} className="text-ink hover:text-accent">
                      {w.workflowName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted">{w.count}</td>
                  <td className="px-5 py-2.5">
                    <RateBar success={w.completedCount} error={w.failedCount} />
                  </td>
                  <td className="px-5 py-2.5 text-ink-muted">{formatMs(w.avgDurationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
