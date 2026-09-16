import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { workflowsRepo } from "@ai-agent/storage";
import { CreateWorkflowButton } from "./_components/create-workflow-button";

export default async function WorkflowsPage() {
  const ctx = await requireCurrentContext();
  const workflows = await workflowsRepo.listWorkflows(ctx.orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Workflows</h1>
          <p className="mt-1 text-sm text-ink-muted">Trigger → Agent → Condition → Tool → Action, visually.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/workflows/runs" className="btn-secondary">
            All runs
          </Link>
          <CreateWorkflowButton />
        </div>
      </div>

      {workflows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-muted">No workflows yet.</div>
      ) : (
        <div className="card divide-y divide-border-subtle">
          {workflows.map((wf) => (
            <Link key={wf.id} href={`/workflows/${wf.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised">
              <div>
                <div className="text-sm font-medium text-ink">{wf.name}</div>
                <div className="text-xs text-ink-muted">{wf.description || "No description"}</div>
              </div>
              <span className={`badge ${wf.status === "published" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                {wf.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
