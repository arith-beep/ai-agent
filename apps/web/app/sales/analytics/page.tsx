import { requireCurrentContext } from "@/lib/session";
import { salesRepo, schema } from "@ai-agent/storage";
import { LeadStatusBadge } from "../_components/status-badge";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold text-ink">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-ink-faint">{hint}</div> : null}
    </div>
  );
}

const CHART_HEIGHT = 120;

export default async function SalesAnalyticsPage() {
  const ctx = await requireCurrentContext();
  const [stats, conversationsPerDay, leadFunnelRows, toolUsage] = await Promise.all([
    salesRepo.getOverviewStats(ctx.orgId),
    salesRepo.getConversationsPerDay(ctx.orgId),
    salesRepo.getLeadFunnel(ctx.orgId),
    salesRepo.getSalesToolUsage(ctx.orgId),
  ]);

  const funnelByStatus = new Map(leadFunnelRows.map((r) => [r.status, r.n]));
  const funnelOrder = schema.salesLeadStatusEnum.enumValues;
  const funnelMax = Math.max(1, ...funnelOrder.map((s) => funnelByStatus.get(s) ?? 0));
  const hasFunnelData = leadFunnelRows.some((r) => r.n > 0);

  const dayMax = Math.max(1, ...conversationsPerDay.map((d) => d.n));
  const hasDayData = conversationsPerDay.some((d) => d.n > 0);

  if (stats.totalAgents === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-muted">Performance across every sales agent in your org.</p>
        </div>
        <div className="card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <div className="text-sm font-medium text-ink">Not enough data yet</div>
          <p className="max-w-sm text-sm text-ink-muted">Create and deploy a sales agent to start seeing analytics here.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">Performance across every sales agent in your org.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active Agents" value={String(stats.activeAgents)} hint={`${stats.totalAgents} total`} />
        <StatCard label="Total Conversations" value={String(stats.totalConversations)} />
        <StatCard label="Leads Generated" value={String(stats.totalLeads)} />
        <StatCard label="Qualified Leads" value={String(stats.qualifiedLeads)} />
        <StatCard label="Meetings Booked" value={String(stats.meetingsBooked)} />
        <StatCard label="Conversion Rate" value={`${(stats.conversionRate * 100).toFixed(1)}%`} hint="qualified / conversations" />
      </div>

      <div className="mt-8 card p-5">
        <h2 className="mb-4 text-sm font-medium text-ink">Conversations per day</h2>
        {!hasDayData ? (
          <p className="py-8 text-center text-sm text-ink-faint">Not enough data yet.</p>
        ) : (
          <div className="flex items-end gap-1" style={{ height: CHART_HEIGHT }}>
            {conversationsPerDay.map((d) => (
              <div key={d.day} className="group relative flex-1">
                <div className="flex flex-col-reverse" style={{ height: CHART_HEIGHT }}>
                  <div
                    className="w-full rounded-t-sm bg-accent"
                    style={{ height: `${Math.max(2, (d.n / dayMax) * CHART_HEIGHT)}px` }}
                  />
                </div>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  <div className="font-medium text-ink">
                    {new Date(`${d.day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                  <div className="text-ink-muted">{d.n} conversation{d.n === 1 ? "" : "s"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-ink">Lead funnel</h2>
          {!hasFunnelData ? (
            <p className="py-8 text-center text-sm text-ink-faint">Not enough data yet.</p>
          ) : (
            <div className="space-y-3">
              {funnelOrder.map((status) => {
                const n = funnelByStatus.get(status) ?? 0;
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between">
                      <LeadStatusBadge status={status} />
                      <span className="text-xs text-ink-muted">{n}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border-subtle">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(n > 0 ? 3 : 0, (n / funnelMax) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-ink">Tool usage</h2>
          {toolUsage.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-faint">Not enough data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-ink-muted">
                  <th className="pb-2 font-medium">Tool</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium text-right">Success</th>
                  <th className="pb-2 font-medium text-right">Errors</th>
                </tr>
              </thead>
              <tbody>
                {toolUsage.map((t) => (
                  <tr key={t.toolId} className="border-b border-border-subtle last:border-0">
                    <td className="py-2 text-ink">{t.toolName}</td>
                    <td className="py-2 text-right text-ink-muted">{t.totalCalls}</td>
                    <td className="py-2 text-right text-success">{t.successCalls}</td>
                    <td className="py-2 text-right text-danger">{t.errorCalls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
