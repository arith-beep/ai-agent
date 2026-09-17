import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { Plus, ArrowUpRight, UserCheck, MessageSquareText, CalendarCheck2, TrendingUp, Sparkle } from "lucide-react";
import { LeadStatusBadge } from "./_components/status-badge";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatTile({ icon: Icon, label, value, hint }: { icon: typeof UserCheck; label: string; value: string; hint?: string }) {
  return (
    <div className="surface flex items-start gap-3.5 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pnl bg-brand-soft text-brand">
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-fg-muted">{label}</div>
        <div className="mt-0.5 font-display text-[22px] font-semibold leading-none text-fg">{value}</div>
        {hint && <div className="mt-1 text-[11px] text-fg-faint">{hint}</div>}
      </div>
    </div>
  );
}

function ConversionRing({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - Math.min(rate, 1));
  return (
    <div className="surface flex items-center gap-4 p-4">
      <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgb(var(--hairline))" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="rgb(var(--brand))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s var(--ease-premium)" }}
        />
      </svg>
      <div>
        <div className="text-[12px] font-medium text-fg-muted">Conversion rate</div>
        <div className="mt-0.5 font-display text-[22px] font-semibold leading-none text-fg">{pct}%</div>
        <div className="mt-1 text-[11px] text-fg-faint">qualified ÷ conversations</div>
      </div>
    </div>
  );
}

export default async function SalesOverviewPage() {
  const ctx = await requireCurrentContext();
  const agents = await salesRepo.listAgents(ctx.orgId);

  if (agents.length === 0) {
    redirect("/sales/onboarding");
  }

  const [stats, recentConversations, recentActivity] = await Promise.all([
    salesRepo.getOverviewStats(ctx.orgId),
    salesRepo.listConversations(ctx.orgId, { excludeTest: true }),
    salesRepo.listRecentActivity(ctx.orgId, 8),
  ]);

  const hasActivity = stats.totalConversations > 0;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Overview</h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">Welcome back, {ctx.userName.split(" ")[0]}.</p>
        </div>
        <Link href="/sales/agents/new" className="btn-brand gap-1.5">
          <Plus size={15} strokeWidth={2.25} />
          Create Sales Agent
        </Link>
      </div>

      {!hasActivity ? (
        <div className="surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Sparkle size={20} strokeWidth={1.75} />
          </div>
          <div className="font-display text-[16px] font-semibold text-fg">No conversations yet</div>
          <p className="max-w-sm text-[13.5px] text-fg-muted">
            {agents[0]?.status === "active"
              ? "Your agent is live — once a visitor starts chatting, everything shows up here in real time."
              : "Deploy your agent and open the Test Playground to see conversations, leads and qualification appear here."}
          </p>
          <Link href={`/sales/agents/${agents[0]?.id}`} className="btn-outline mt-1">
            Go to {agents[0]?.name}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ConversionRing rate={stats.conversionRate} />
            <StatTile icon={UserCheck} label="Qualified Leads" value={String(stats.qualifiedLeads)} hint={`${stats.totalLeads} total leads`} />
            <StatTile icon={MessageSquareText} label="Conversations" value={String(stats.totalConversations)} />
            <StatTile icon={CalendarCheck2} label="Meetings Booked" value={String(stats.meetingsBooked)} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="surface lg:col-span-3">
              <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
                <h2 className="text-[13.5px] font-medium text-fg">Recent conversations</h2>
                <Link href="/sales/conversations" className="flex items-center gap-1 text-[12.5px] font-medium text-brand hover:text-brand-hover">
                  View all <ArrowUpRight size={13} />
                </Link>
              </div>
              <div className="divide-y divide-hairline-soft">
                {recentConversations.slice(0, 6).map((row) => (
                  <Link
                    key={row.conversation.id}
                    href={`/sales/conversations/${row.conversation.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors duration-150 hover:bg-sunken"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] text-fg">{row.leadName ?? row.leadEmail ?? "Anonymous visitor"}</div>
                      <div className="text-[11.5px] text-fg-faint">with {row.agentName}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      {row.leadStatus ? <LeadStatusBadge status={row.leadStatus} /> : null}
                      <span className="text-[11px] text-fg-faint">{timeAgo(row.conversation.lastMessageAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="surface lg:col-span-2">
              <div className="border-b border-hairline px-5 py-3.5">
                <h2 className="text-[13.5px] font-medium text-fg">Agent activity</h2>
              </div>
              <div className="space-y-0 divide-y divide-hairline-soft">
                {recentActivity.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[13px] text-fg-faint">No activity yet.</p>
                ) : (
                  recentActivity.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 px-5 py-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive">
                        <TrendingUp size={12} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-snug text-fg">
                          <span className="font-medium">{event.agentName ?? "An agent"}</span> qualified{" "}
                          <span className="font-medium">{event.leadName ?? "a lead"}</span> as{" "}
                          <LeadStatusBadge status={event.status} />
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-fg-faint">{event.reason}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-fg-faint">{timeAgo(event.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
