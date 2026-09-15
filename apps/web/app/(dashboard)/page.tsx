import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { agentsRepo, runsRepo, tasksRepo, policyRepo, workflowsRepo } from "@ai-agent/storage";

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-opacity hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function DashboardPage() {
  const ctx = await requireCurrentContext();

  const [agents, recentRuns, tasks, approvals, workflows] = await Promise.all([
    agentsRepo.listAgents(ctx.orgId),
    runsRepo.listRunsForOrg(ctx.orgId, 10),
    tasksRepo.listTasksForOrg(ctx.orgId),
    policyRepo.listPendingApprovals(ctx.orgId),
    workflowsRepo.listWorkflows(ctx.orgId),
  ]);

  const activeAgents = agents.filter((a) => a.status === "enabled").length;
  const openTasks = tasks.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const failedRuns = recentRuns.filter((r) => r.run.status === "failed").length;
  const totalCost = recentRuns.reduce((sum, r) => sum + Number(r.run.estimatedCost ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">Welcome back, {ctx.userName}.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active Agents" value={`${activeAgents}/${agents.length}`} href="/agents" />
        <StatCard label="Workflows" value={workflows.length} href="/workflows" />
        <StatCard label="Open Tasks" value={openTasks} href="/tasks" />
        <StatCard label="Pending Approvals" value={approvals.length} href="/tasks" />
        <StatCard label="Recent Runs" value={recentRuns.length} href="/runs" />
        <StatCard label="Failures (recent)" value={failedRuns} href="/runs" />
        <StatCard label="Est. Cost (recent runs)" value={`$${totalCost.toFixed(4)}`} href="/analytics" />
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Recent runs</div>
        <div className="divide-y divide-border-subtle">
          {recentRuns.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No runs yet — go create an agent and try it in the Playground.</div>}
          {recentRuns.map(({ run, agentName }) => (
            <Link key={run.id} href={`/runs/${run.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-surface-raised">
              <div className="flex items-center gap-3">
                <StatusDot status={run.status} />
                <span className="text-ink">{agentName}</span>
              </div>
              <span className="text-ink-faint">{new Date(run.startedAt).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "completed" ? "bg-success" : status === "failed" ? "bg-danger" : status === "waiting_approval" ? "bg-warning" : "bg-accent";
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}
