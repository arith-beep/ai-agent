import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { runsRepo, agentsRepo } from "@ai-agent/storage";
import { SpanTree } from "./_components/span-tree";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  waiting_approval: "bg-warning/15 text-warning",
  running: "bg-accent/15 text-accent",
  queued: "bg-ink-faint/15 text-ink-faint",
};

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const run = await runsRepo.getAgentRun(id);
  if (!run) notFound();
  const agent = await agentsRepo.getAgentById(ctx.orgId, run.agentId);
  if (!agent) notFound();

  const trace = await runsRepo.getTraceForRun("agent", id);
  const spans = trace ? await runsRepo.listSpansForTrace(trace.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Run: {agent.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">{new Date(run.startedAt).toLocaleString()}</p>
        </div>
        <span className={`badge ${STATUS_STYLES[run.status] ?? "bg-surface-raised text-ink-muted"}`}>{run.status}</span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Duration</div>
          <div className="mt-1 text-sm text-ink">
            {run.completedAt ? `${new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()}ms` : "in progress"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Tokens</div>
          <div className="mt-1 text-sm text-ink">{run.tokenUsage?.totalTokens ?? "-"}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Est. cost</div>
          <div className="mt-1 text-sm text-ink">{run.estimatedCost ? `$${Number(run.estimatedCost).toFixed(5)}` : "-"}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-faint">Spans</div>
          <div className="mt-1 text-sm text-ink">{spans.length}</div>
        </div>
      </div>

      {run.errorMessage && <div className="card border-danger/40 bg-danger/10 p-4 text-sm text-danger">{run.errorMessage}</div>}

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Execution trace</h2>
        <SpanTree spans={spans} />
      </div>
    </div>
  );
}
