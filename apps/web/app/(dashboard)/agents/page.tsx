import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { agentsRepo } from "@ai-agent/storage";

const STATUS_STYLES: Record<string, string> = {
  enabled: "bg-success/15 text-success",
  disabled: "bg-ink-faint/15 text-ink-faint",
  draft: "bg-warning/15 text-warning",
};

export default async function AgentsPage() {
  const ctx = await requireCurrentContext();
  const agents = await agentsRepo.listAgents(ctx.orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Agents</h1>
          <p className="mt-1 text-sm text-ink-muted">Create, configure, and manage your AI workforce.</p>
        </div>
        <Link href="/agents/new" className="btn-primary">
          + Create agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted">No agents yet.</p>
          <Link href="/agents/new" className="btn-primary mt-4 inline-flex">
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-border-subtle">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{agent.name}</span>
                  <span className={`badge ${STATUS_STYLES[agent.status]}`}>{agent.status}</span>
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  {agent.role} · {agent.modelProvider}/{agent.modelName}
                </div>
              </div>
              <span className="text-xs text-ink-faint">Created {new Date(agent.createdAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
