import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { toolsRepo } from "@ai-agent/storage";
import { AuthConfigForm } from "./_components/auth-config-form";
import { DeleteToolButton } from "./_components/delete-tool-button";
import { CustomToolForm, type CustomToolParamInitial } from "../_components/custom-tool-form";

function truncate(value: unknown, max = 300): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function durationOf(exec: { startedAt: Date; completedAt: Date | null }): string {
  if (!exec.completedAt) return "in progress";
  return `${exec.completedAt.getTime() - exec.startedAt.getTime()}ms`;
}

function jsonSchemaToParams(schema: Record<string, unknown> | null | undefined): CustomToolParamInitial[] {
  const properties = (schema?.properties as Record<string, { type?: string; description?: string }> | undefined) ?? {};
  const required = new Set((schema?.required as string[] | undefined) ?? []);
  return Object.entries(properties).map(([name, prop]) => ({
    name,
    type: (prop.type as "string" | "number" | "boolean") ?? "string",
    description: prop.description,
    required: required.has(name),
  }));
}

export default async function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const tool = await toolsRepo.getToolById(ctx.orgId, id);
  if (!tool) notFound();

  const executions = await toolsRepo.listToolExecutions(id, 30);
  const isCustom = !tool.builtinKey;
  const executionConfig = tool.executionConfig as { kind: "http"; url: string; method: string; headers?: Record<string, string>; body?: unknown } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{tool.name}</h1>
            <span className="badge bg-surface-raised text-ink-muted">{tool.category}</span>
            {tool.requiresApproval && <span className="badge bg-warning/15 text-warning">requires approval</span>}
            {isCustom && <span className="badge bg-accent/15 text-accent">custom</span>}
          </div>
          <p className="mt-1 text-sm text-ink-muted">{tool.description}</p>
        </div>
        {isCustom && <DeleteToolButton toolId={tool.id} />}
      </div>

      <AuthConfigForm toolId={tool.id} hasConfig={Boolean(tool.authConfigEncrypted)} />

      {isCustom && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink">Configuration</h2>
          <CustomToolForm
            initial={{
              id: tool.id,
              name: tool.name,
              description: tool.description,
              category: tool.category,
              requiresApproval: tool.requiresApproval,
              params: jsonSchemaToParams(tool.inputSchema),
              executionConfig: executionConfig ?? undefined,
            }}
          />
        </div>
      )}

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
                <div className="flex items-center gap-3 text-xs text-ink-faint">
                  <span>{durationOf(exec)}</span>
                  <span>{new Date(exec.startedAt).toLocaleString()}</span>
                </div>
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
