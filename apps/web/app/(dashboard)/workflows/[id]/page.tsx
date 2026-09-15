import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { workflowsRepo } from "@ai-agent/storage";
import type { WorkflowDefinition } from "@ai-agent/shared-types";
import { WorkflowCanvas } from "../_components/workflow-canvas";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
  suspended: "bg-warning/15 text-warning",
  running: "bg-accent/15 text-accent",
  queued: "bg-ink-faint/15 text-ink-faint",
};

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const workflow = await workflowsRepo.getWorkflow(id);
  if (!workflow || workflow.orgId !== ctx.orgId) notFound();

  const runs = await workflowsRepo.listWorkflowRuns(id, 20);

  return (
    <div className="space-y-6">
      <WorkflowCanvas
        workflowId={workflow.id}
        name={workflow.name}
        status={workflow.status}
        initialDefinition={workflow.definition as unknown as WorkflowDefinition}
      />

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Runs</div>
        <div className="divide-y divide-border-subtle">
          {runs.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No runs yet — click Run above to start one.</div>}
          {runs.map((run) => (
            <Link key={run.id} href={`/workflows/${id}/runs/${run.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-surface-raised">
              <span className={`badge ${STATUS_STYLES[run.status] ?? "bg-surface-raised text-ink-muted"}`}>{run.status}</span>
              <span className="text-ink-faint">{new Date(run.startedAt).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
