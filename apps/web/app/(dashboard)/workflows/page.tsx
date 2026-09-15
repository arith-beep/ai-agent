import { requireCurrentContext } from "@/lib/session";
import { workflowsRepo } from "@ai-agent/storage";

export default async function WorkflowsPage() {
  const ctx = await requireCurrentContext();
  const workflows = await workflowsRepo.listWorkflows(ctx.orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Workflows</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The workflow engine (triggers, branches, loops, approvals, suspend/resume) is fully built on the backend — the visual builder UI to
          author workflows from the dashboard is the next milestone.
        </p>
      </div>

      <div className="card divide-y divide-border-subtle">
        {workflows.length === 0 && (
          <div className="px-5 py-6 text-sm text-ink-faint">No workflows yet. Workflow authoring UI is coming in Milestone 2.</div>
        )}
        {workflows.map((wf) => (
          <div key={wf.id} className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-ink">{wf.name}</span>
            <span className="badge bg-surface-raised text-ink-muted">{wf.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
