import { requireCurrentContext } from "@/lib/session";
import { policyRepo, agentsRepo } from "@ai-agent/storage";
import { ApprovalInlineAction } from "./_components/approval-inline-action";

export default async function ApprovalsPage() {
  const ctx = await requireCurrentContext();
  const [approvals, agents] = await Promise.all([policyRepo.listPendingApprovals(ctx.orgId), agentsRepo.listAgents(ctx.orgId)]);
  const agentNames = new Map(agents.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Approvals</h1>
        <p className="mt-1 text-sm text-ink-muted">Actions agents have queued that need a human decision before they run.</p>
      </div>

      {approvals.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-muted">Nothing pending.</div>
      ) : (
        <div className="card divide-y divide-border-subtle">
          {approvals.map((a) => (
            <div key={a.id} className="space-y-2 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-ink">{a.actionType}</div>
                  <div className="text-xs text-ink-muted">
                    Requested by{" "}
                    {a.requestedByType === "agent"
                      ? (agentNames.get(a.requestedById) ?? "an agent")
                      : a.requestedById === ctx.userId
                        ? "you"
                        : "a teammate"}{" "}
                    · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
                {a.workflowRunId && <span className="badge bg-accent/15 text-accent">workflow</span>}
              </div>
              <pre className="max-h-32 overflow-auto rounded-md bg-canvas p-2 font-mono text-[11px] text-ink-muted">
                {JSON.stringify(a.payload, null, 2)}
              </pre>
              <ApprovalInlineAction approvalId={a.id} actionType={a.actionType} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
