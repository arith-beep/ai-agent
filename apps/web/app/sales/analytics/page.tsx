import { requireCurrentContext } from "@/lib/session";
import { salesRepo, schema } from "@ai-agent/storage";
import { BarChart3 } from "lucide-react";
import { LeadStatusBadge } from "../_components/status-badge";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-4">
      <div className="text-[12px] font-medium text-fg-muted">{label}</div>
      <div className="mt-1.5 font-display text-[22px] font-semibold leading-none text-fg">{value}</div>
      {hint ? <div className="mt-1.5 text-[11px] text-fg-faint">{hint}</div> : null}
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
        <div className="mb-7">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Analytics</h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">Performance across every sales agent in your org.</p>
        </div>
        <div className="surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
            <BarChart3 size={20} strokeWidth={1.75} />
          </div>
          <div className="font-display text-[16px] font-semibold text-fg">Not enough data yet</div>
          <p className="max-w-sm text-[13.5px] text-fg-muted">Create and deploy a sales agent to start seeing analytics here.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Analytics</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Performance across every sales agent in your org.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active Agents" value={String(stats.activeAgents)} hint={`${stats.totalAgents} total`} />
        <StatCard label="Total Conversations" value={String(stats.totalConversations)} />
        <StatCard label="Leads Generated" value={String(stats.totalLeads)} />
        <StatCard label="Qualified Leads" value={String(stats.qualifiedLeads)} />
        <StatCard label="Meetings Booked" value={String(stats.meetingsBooked)} />
        <StatCard label="Conversion Rate" value={`${(stats.conversionRate * 100).toFixed(1)}%`} hint="qualified / conversations" />
      </div>

      <div className="surface mt-6 p-5">
        <h2 className="mb-4 text-[13.5px] font-medium text-fg">Conversations per day</h2>
        {!hasDayData ? (
          <p className="py-8 text-center text-[13px] text-fg-faint">Not enough data yet.</p>
        ) : (
          <div className="flex items-end gap-1" style={{ height: CHART_HEIGHT }}>
            {conversationsPerDay.map((d) => (
              <div key={d.day} className="group relative flex-1">
                <div className="flex flex-col-reverse" style={{ height: CHART_HEIGHT }}>
                  <div
                    className="w-full rounded-t-sm bg-brand transition-colors duration-150 group-hover:bg-brand-hover"
                    style={{ height: `${Math.max(2, (d.n / dayMax) * CHART_HEIGHT)}px` }}
                  />
                </div>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-pnl border border-hairline bg-panel px-2.5 py-1.5 text-[12px] opacity-0 shadow-elevate-md transition-opacity duration-150 group-hover:opacity-100">
                  <div className="font-medium text-fg">
                    {new Date(`${d.day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                  <div className="text-fg-muted">
                    {d.n} conversation{d.n === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="mb-4 text-[13.5px] font-medium text-fg">Lead funnel</h2>
          {!hasFunnelData ? (
            <p className="py-8 text-center text-[13px] text-fg-faint">Not enough data yet.</p>
          ) : (
            <div className="space-y-3.5">
              {funnelOrder.map((status) => {
                const n = funnelByStatus.get(status) ?? 0;
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <LeadStatusBadge status={status} />
                      <span className="text-[12px] text-fg-muted">{n}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-500 ease-premium"
                        style={{ width: `${Math.max(n > 0 ? 3 : 0, (n / funnelMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="surface p-5">
          <h2 className="mb-4 text-[13.5px] font-medium text-fg">Tool usage</h2>
          {toolUsage.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-fg-faint">Not enough data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-hairline text-left text-[11.5px] text-fg-faint">
                    <th className="pb-2 font-medium">Tool</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                    <th className="pb-2 text-right font-medium">Success</th>
                    <th className="pb-2 text-right font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {toolUsage.map((t) => (
                    <tr key={t.toolId} className="border-b border-hairline-soft last:border-0">
                      <td className="py-2.5 text-fg">{t.toolName}</td>
                      <td className="py-2.5 text-right text-fg-muted">{t.totalCalls}</td>
                      <td className="py-2.5 text-right text-positive">{t.successCalls}</td>
                      <td className="py-2.5 text-right text-critical">{t.errorCalls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
