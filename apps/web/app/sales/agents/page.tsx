import Link from "next/link";
import { Plus, MessageSquare, UserCheck, TrendingUp, FlaskConical, Pencil } from "lucide-react";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { AgentStatusBadge } from "../_components/status-badge";
import { PauseResumeButton } from "./_components/pause-resume-button";

function relativeTime(date: Date | null): string {
  if (!date) return "No activity yet";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default async function SalesAgentsPage() {
  const ctx = await requireCurrentContext();
  const [agents, statsByAgent] = await Promise.all([salesRepo.listAgents(ctx.orgId), salesRepo.getAgentStats(ctx.orgId)]);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Sales Agents</h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">Create and configure AI agents that talk to your leads.</p>
        </div>
        <Link href="/sales/agents/new" className="btn-brand gap-1.5">
          <Plus size={15} />
          Create Sales Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-pnl-lg bg-brand-soft text-brand">
            <Plus size={20} />
          </div>
          <div className="text-[14.5px] font-medium text-fg">No sales agents yet</div>
          <p className="max-w-sm text-[13.5px] text-fg-muted">
            Describe what you want your agent to do, or build one from scratch — identity, playbook, knowledge, tools, and guardrails all live here.
          </p>
          <Link href="/sales/agents/new" className="btn-brand mt-2 gap-1.5">
            <Plus size={15} />
            Create Sales Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {agents.map((agent) => {
            const stats = statsByAgent[agent.id];
            const conversationCount = stats?.conversationCount ?? 0;
            const qualifiedCount = stats?.qualifiedLeadCount ?? 0;
            const conversion = conversationCount > 0 ? Math.round((qualifiedCount / conversationCount) * 100) : null;
            const initial = agent.name.trim().charAt(0).toUpperCase() || "A";

            return (
              <div key={agent.id} className="surface flex flex-col p-5 transition-shadow hover:shadow-elevate-sm">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/sales/agents/${agent.id}`} className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pnl-lg bg-brand-soft font-display text-[15px] font-semibold text-brand">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[14.5px] font-medium text-fg">{agent.name}</div>
                      <div className="truncate text-[12.5px] text-fg-muted">
                        {agent.role} at {agent.companyName}
                      </div>
                    </div>
                  </Link>
                  <AgentStatusBadge status={agent.status} />
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[12px] text-fg-faint">
                  <span className={`h-1.5 w-1.5 rounded-full ${agent.status === "active" ? "bg-positive" : "bg-fg-faint"}`} />
                  {agent.status === "active" ? `Live — last active ${relativeTime(stats?.lastActivityAt ?? null)}` : "Not deployed"}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline-soft pt-4">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-fg-faint">
                      <MessageSquare size={11} />
                      Conversations
                    </div>
                    <div className="mt-1 text-[16px] font-semibold text-fg">{conversationCount}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-fg-faint">
                      <UserCheck size={11} />
                      Qualified
                    </div>
                    <div className="mt-1 text-[16px] font-semibold text-fg">{qualifiedCount}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-fg-faint">
                      <TrendingUp size={11} />
                      Conversion
                    </div>
                    <div className="mt-1 text-[16px] font-semibold text-fg">{conversion === null ? "—" : `${conversion}%`}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-hairline-soft pt-4">
                  <Link href={`/sales/agents/${agent.id}`} className="btn-outline flex-1 gap-1.5 !py-1.5 text-[12.5px]">
                    <Pencil size={13} />
                    Edit
                  </Link>
                  <Link href={`/sales/agents/${agent.id}/playground`} className="btn-outline flex-1 gap-1.5 !py-1.5 text-[12.5px]">
                    <FlaskConical size={13} />
                    Test
                  </Link>
                  <PauseResumeButton agentId={agent.id} status={agent.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
