import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { toolsRepo } from "@ai-agent/storage";
import { AuthConfigForm } from "./_components/auth-config-form";

function truncate(value: unknown, max = 300): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default async function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const tool = await toolsRepo.getToolById(ctx.orgId, id);
  if (!tool) notFound();

  const executions = await toolsRepo.listToolExecutions(id, 30);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-ink">{tool.name}</h1>
          <span className="badge bg-surface-raised text-ink-muted">{tool.category}</span>
          {tool.requiresApproval && <span className="badge bg-warning/15 text-warning">requires approval</span>}
        </div>
        <p className="mt-1 text-sm text-ink-muted">{tool.description}</p>
      </div>

      <AuthConfigForm toolId={tool.id} hasConfig={Boolean(tool.authConfigEncrypted)} />

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Execution log</div>
        <div className="divide-y divide-border-subtle">
          {executions.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No executions yet.</div>}
          {executions.map((exec) => (
            <div key={exec.id} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className={exec.status === "success" ? "badge bg-success/15 text-success" : "badge bg-danger/15 text-danger"}>
                  {exec.status}
                </span>
                <span className="text-xs text-ink-faint">{new Date(exec.startedAt).toLocaleString()}</span>
              </div>
              <div className="mt-1 truncate font-mono text-xs text-ink-muted" title={truncate(exec.input, 2000)}>
                in: {truncate(exec.input)}
              </div>
              {exec.status === "success" ? (
                <div className="mt-0.5 truncate font-mono text-xs text-ink-muted" title={truncate(exec.output, 2000)}>
                  out: {truncate(exec.output)}
                </div>
              ) : (
                <div className="mt-0.5 text-xs text-danger">{exec.errorMessage}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
