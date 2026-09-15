import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { workflowsRepo, runsRepo, policyRepo } from "@ai-agent/storage";
import { SpanTree } from "../../../../runs/[id]/_components/span-tree";
import { ApprovalInlineAction } from "../../../../approvals/_components/approval-inline-action";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  suspended: "bg-warning/15 text-warning",
  running: "bg-accent/15 text-accent",
  queued: "bg-ink-faint/15 text-ink-faint",
};

export default async function WorkflowRunDetailPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const ctx = await requireCurrentContext();

  const workflow = await workflowsRepo.getWorkflow(id);
  if (!workflow || workflow.orgId !== ctx.orgId) notFound();

  const run = await workflowsRepo.getWorkflowRun(runId);
  if (!run || run.workflowId !== id) notFound();

  const trace = await runsRepo.getTraceForRun("workflow", runId);
  const spans = trace ? await runsRepo.listSpansForTrace(trace.id) : [];

  let pendingApproval = null;
  if (run.status === "suspended") {
    const pending = await policyRepo.listPendingApprovals(ctx.orgId);
    pendingApproval = pending.find((a) => a.workflowRunId === runId) ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{workflow.name} — run</h1>
          <p className="mt-1 text-sm text-ink-muted">{new Date(run.startedAt).toLocaleString()}</p>
        </div>
        <span className={`badge ${STATUS_STYLES[run.status] ?? "bg-surface-raised text-ink-muted"}`}>{run.status}</span>
      </div>

      {run.status === "suspended" && (
        <div className="card border-warning/40 bg-warning/10 p-4">
          <p className="text-sm text-ink">This run is suspended, waiting on an external event (approval, delay, or resume signal).</p>
          {pendingApproval && (
            <div className="mt-3">
              <ApprovalInlineAction approvalId={pendingApproval.id} actionType={pendingApproval.actionType} />
            </div>
          )}
        </div>
      )}

      {run.errorMessage && <div className="card border-danger/40 bg-danger/10 p-4 text-sm text-danger">{run.errorMessage}</div>}

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-medium text-ink">Execution trace</h2>
        <SpanTree spans={spans} />
      </div>
    </div>
  );
}
