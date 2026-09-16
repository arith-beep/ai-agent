import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { workflowsRepo, schema } from "@ai-agent/storage";
import { RunFilters } from "./_components/run-filters";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  suspended: "bg-warning/15 text-warning",
  running: "bg-accent/15 text-accent",
  queued: "bg-ink-faint/15 text-ink-faint",
  cancelled: "bg-ink-faint/15 text-ink-faint",
};

function isValidStatus(value: string): value is (typeof schema.workflowRunStatusEnum.enumValues)[number] {
  return (schema.workflowRunStatusEnum.enumValues as readonly string[]).includes(value);
}

export default async function AllWorkflowRunsPage({ searchParams }: { searchParams: Promise<{ status?: string; workflowId?: string }> }) {
  const ctx = await requireCurrentContext();
  const { status, workflowId } = await searchParams;

  const [workflows, runs] = await Promise.all([
    workflowsRepo.listWorkflows(ctx.orgId),
    workflowsRepo.listWorkflowRunsForOrg(ctx.orgId, {
      statuses: status && isValidStatus(status) ? [status] : undefined,
      workflowId: workflowId || undefined,
      limit: 200,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Workflow runs</h1>
          <p className="mt-1 text-sm text-ink-muted">Every workflow execution across your organization.</p>
        </div>
        <RunFilters workflows={workflows.map((w) => ({ id: w.id, name: w.name }))} />
      </div>

      <div className="card divide-y divide-border-subtle">
        {runs.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No workflow runs match these filters.</div>}
        {runs.map(({ run, workflowId: wfId, workflowName }) => (
          <Link key={run.id} href={`/workflows/${wfId}/runs/${run.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised">
            <div className="flex items-center gap-3">
              <span className={`badge ${STATUS_STYLES[run.status] ?? "bg-surface-raised text-ink-muted"}`}>{run.status}</span>
              <span className="text-sm text-ink">{workflowName}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-faint">
              {run.completedAt && <span>{run.completedAt.getTime() - run.startedAt.getTime()}ms</span>}
              <span>{new Date(run.startedAt).toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
