import Link from "next/link";
import { requireCurrentContext } from "@/lib/session";
import { toolsRepo } from "@ai-agent/storage";
import { SeedToolsButton } from "./_components/seed-button";

function ToolRow({ tool }: { tool: { id: string; name: string; category: string; description: string; requiresApproval: boolean; authConfigEncrypted: Buffer | null } }) {
  return (
    <Link href={`/tools/${tool.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-raised">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{tool.name}</span>
          <span className="badge bg-surface-raised text-ink-muted">{tool.category}</span>
          {tool.requiresApproval && <span className="badge bg-warning/15 text-warning">requires approval</span>}
          {tool.authConfigEncrypted && <span className="badge bg-success/15 text-success">configured</span>}
        </div>
        <p className="mt-0.5 text-xs text-ink-muted">{tool.description}</p>
      </div>
    </Link>
  );
}

export default async function ToolsPage() {
  const ctx = await requireCurrentContext();
  const tools = await toolsRepo.listTools(ctx.orgId);
  const builtinTools = tools.filter((t) => t.builtinKey);
  const customTools = tools.filter((t) => !t.builtinKey);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Tools</h1>
          <p className="mt-1 text-sm text-ink-muted">The registry of capabilities agents and workflows can call.</p>
        </div>
        <div className="flex items-center gap-2">
          <SeedToolsButton />
          <Link href="/tools/new" className="btn-primary">
            New custom tool
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">Built-in</h2>
        {builtinTools.length === 0 ? (
          <div className="card p-10 text-center text-sm text-ink-muted">No tools yet. Seed the built-in tools to get started.</div>
        ) : (
          <div className="card divide-y divide-border-subtle">
            {builtinTools.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">Custom</h2>
        {customTools.length === 0 ? (
          <div className="card p-10 text-center text-sm text-ink-muted">
            No custom tools yet.{" "}
            <Link href="/tools/new" className="text-accent hover:underline">
              Create one
            </Link>{" "}
            to wire up any authenticated HTTP endpoint as a tool.
          </div>
        ) : (
          <div className="card divide-y divide-border-subtle">
            {customTools.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
