import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { AgentStatusBadge } from "../_components/status-badge";

export default async function SalesAgentsPage() {
  const ctx = await requireCurrentContext();
  const agents = await salesRepo.listAgents(ctx.orgId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Sales Agents</h1>
          <p className="mt-1 text-sm text-ink-muted">Create and configure AI agents that talk to your leads.</p>
        </div>
        <Link href="/sales/agents/new" className="btn-primary">
          Create Sales Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="text-sm font-medium text-ink">No sales agents yet</div>
          <p className="max-w-sm text-sm text-ink-muted">
            Describe what you want your agent to do, or build one from scratch — identity, playbook, knowledge, tools, and guardrails all live here.
          </p>
          <Link href="/sales/agents/new" className="btn-primary mt-2">
            Create Sales Agent
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-border-subtle">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/sales/agents/${agent.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{agent.name}</span>
                  <AgentStatusBadge status={agent.status} />
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  {agent.role} at {agent.companyName}
                </div>
              </div>
              <span className="text-xs text-ink-faint">Updated {new Date(agent.updatedAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
