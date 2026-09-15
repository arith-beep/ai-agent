import { requireCurrentContext } from "@/lib/session";
import { toolsRepo } from "@ai-agent/storage";
import { SeedToolsButton } from "./_components/seed-button";

export default async function ToolsPage() {
  const ctx = await requireCurrentContext();
  const tools = await toolsRepo.listTools(ctx.orgId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Tools</h1>
          <p className="mt-1 text-sm text-ink-muted">The registry of capabilities agents can call.</p>
        </div>
        <SeedToolsButton />
      </div>

      {tools.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-muted">
          No tools yet. Seed the built-in tools (HTTP Request, File Reader, Web Search) to get started.
        </div>
      ) : (
        <div className="card divide-y divide-border-subtle">
          {tools.map((tool) => (
            <div key={tool.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{tool.name}</span>
                  <span className="badge bg-surface-raised text-ink-muted">{tool.category}</span>
                  {tool.requiresApproval && <span className="badge bg-warning/15 text-warning">requires approval</span>}
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">{tool.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
