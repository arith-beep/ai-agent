import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { runsRepo, agentsRepo, schema } from "@ai-agent/storage";
import { RunFilters } from "./_components/run-filters";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  waiting_approval: "bg-warning/15 text-warning",
  running: "bg-accent/15 text-accent",
  queued: "bg-ink-faint/15 text-ink-faint",
};

function isValidStatus(value: string): value is (typeof schema.agentRunStatusEnum.enumValues)[number] {
  return (schema.agentRunStatusEnum.enumValues as readonly string[]).includes(value);
}

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ status?: string; agentId?: string }> }) {
  const ctx = await requireCurrentContext();
  const { status, agentId } = await searchParams;

  const [agents, runs] = await Promise.all([
    agentsRepo.listAgents(ctx.orgId),
    runsRepo.listRunsForOrg(ctx.orgId, 200, {
      status: status && isValidStatus(status) ? status : undefined,
      agentId: agentId || undefined,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Runs</h1>
          <p className="mt-1 text-sm text-ink-muted">Every agent execution, with full traces.</p>
        </div>
        <RunFilters agents={agents.map((a) => ({ id: a.id, name: a.name }))} />
      </div>

      <div className="card divide-y divide-border-subtle">
        {runs.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No runs match these filters.</div>}
        {runs.map(({ run, agentName }) => (
          <Link key={run.id} href={`/runs/${run.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised">
            <div className="flex items-center gap-3">
              <span className={`badge ${STATUS_STYLES[run.status] ?? "bg-surface-raised text-ink-muted"}`}>{run.status}</span>
              <span className="text-sm text-ink">{agentName}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-faint">
              {run.estimatedCost && <span>${Number(run.estimatedCost).toFixed(4)}</span>}
              <span>{new Date(run.startedAt).toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
