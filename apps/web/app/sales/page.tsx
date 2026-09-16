import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { LeadStatusBadge } from "./_components/status-badge";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold text-ink">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-ink-faint">{hint}</div> : null}
    </div>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function SalesOverviewPage() {
  const ctx = await requireCurrentContext();
  const [stats, recentConversations, recentActivity] = await Promise.all([
    salesRepo.getOverviewStats(ctx.orgId),
    salesRepo.listConversations(ctx.orgId, { excludeTest: true }),
    salesRepo.listRecentActivity(ctx.orgId, 8),
  ]);

  const hasAnyData = stats.totalAgents > 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Overview</h1>
          <p className="mt-1 text-sm text-ink-muted">Real-time snapshot of your sales agents' performance.</p>
        </div>
        <Link href="/sales/agents/new" className="btn-primary">
          Create Sales Agent
        </Link>
      </div>

      {!hasAnyData ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="text-sm font-medium text-ink">No sales agents yet</div>
          <p className="max-w-sm text-sm text-ink-muted">
            Create your first sales agent to start qualifying leads and booking meetings automatically.
          </p>
          <Link href="/sales/agents/new" className="btn-primary mt-2">
            Create Sales Agent
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Active Agents" value={String(stats.activeAgents)} hint={`${stats.totalAgents} total`} />
            <StatCard label="Total Conversations" value={String(stats.totalConversations)} />
            <StatCard label="Leads Generated" value={String(stats.totalLeads)} />
            <StatCard label="Qualified Leads" value={String(stats.qualifiedLeads)} />
            <StatCard label="Meetings Booked" value={String(stats.meetingsBooked)} />
            <StatCard label="Conversion Rate" value={`${(stats.conversionRate * 100).toFixed(1)}%`} hint="qualified / conversations" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-ink">Recent Conversations</h2>
                <Link href="/sales/conversations" className="text-xs text-accent hover:underline">
                  View all
                </Link>
              </div>
              {recentConversations.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">No conversations yet.</p>
              ) : (
                <div className="space-y-1">
                  {recentConversations.slice(0, 8).map((row) => (
                    <Link
                      key={row.conversation.id}
                      href={`/sales/conversations/${row.conversation.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-surface-raised"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-ink">{row.leadName ?? row.leadEmail ?? "Anonymous visitor"}</div>
                        <div className="text-[11px] text-ink-faint">with {row.agentName}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {row.leadStatus ? <LeadStatusBadge status={row.leadStatus} /> : null}
                        <span className="text-[11px] text-ink-faint">{timeAgo(row.conversation.lastMessageAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4">
              <h2 className="mb-3 text-sm font-medium text-ink">Recent Agent Activity</h2>
              {recentActivity.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((event) => (
                    <div key={event.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="text-ink">
                          <span className="font-medium">{event.agentName ?? "An agent"}</span> marked{" "}
                          <span className="font-medium">{event.leadName ?? "a lead"}</span> as{" "}
                          <LeadStatusBadge status={event.status} />
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-ink-faint">{event.reason}</div>
                      </div>
                      <span className="shrink-0 text-[11px] text-ink-faint">{timeAgo(event.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
