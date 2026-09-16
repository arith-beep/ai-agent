import { requireCurrentContext } from "@/lib/session";
import { salesRepo, toolsRepo } from "@ai-agent/storage";

const SALES_BUILTIN_KEYS = new Set(["sales_lead_upsert", "sales_meeting_book", "sales_human_handoff"]);

const COMING_SOON = [
  { name: "CRM sync", description: "Push leads and stage changes to Salesforce or HubSpot automatically." },
  { name: "Email", description: "Let agents send and receive follow-up emails on your domain." },
  { name: "WhatsApp", description: "Bring the same qualification playbook to WhatsApp conversations." },
  { name: "Calendar", description: "Book meetings directly onto a rep's real calendar, not just a request." },
];

export default async function SalesIntegrationsPage() {
  const ctx = await requireCurrentContext();
  const [allTools, agentCounts] = await Promise.all([toolsRepo.listTools(ctx.orgId), salesRepo.countAgentsPerTool(ctx.orgId)]);

  const countByToolId = new Map(agentCounts.map((r) => [r.toolId, Number(r.agentCount)]));
  const relevantTools = allTools.filter((t) => (t.builtinKey && SALES_BUILTIN_KEYS.has(t.builtinKey)) || t.category === "custom");
  const builtinTools = relevantTools.filter((t) => t.builtinKey);
  const customTools = relevantTools.filter((t) => !t.builtinKey);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Integrations</h1>
        <p className="mt-1 text-sm text-ink-muted">Tools your sales agents can call, plus what's coming next.</p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-ink">Built-in tools</h2>
        {builtinTools.length === 0 ? (
          <div className="card px-6 py-8 text-center text-sm text-ink-faint">
            Built-in tools are seeded automatically the first time you open a sales agent's builder.
          </div>
        ) : (
          <div className="card divide-y divide-border-subtle">
            {builtinTools.map((tool) => {
              const n = countByToolId.get(tool.id) ?? 0;
              return (
                <div key={tool.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{tool.name}</span>
                      <span className="badge bg-surface-raised text-ink-muted">{tool.category}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">{tool.description}</div>
                  </div>
                  <span className="shrink-0 text-xs text-ink-faint">
                    used by {n} agent{n === 1 ? "" : "s"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-ink">Custom webhook tools</h2>
        {customTools.length === 0 ? (
          <div className="card px-6 py-8 text-center text-sm text-ink-faint">
            No custom webhook tools yet. Add one from a sales agent's builder, under its Tools tab.
          </div>
        ) : (
          <div className="card divide-y divide-border-subtle">
            {customTools.map((tool) => {
              const n = countByToolId.get(tool.id) ?? 0;
              return (
                <div key={tool.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-ink">{tool.name}</span>
                    <div className="mt-0.5 text-xs text-ink-muted">{tool.description}</div>
                  </div>
                  <span className="shrink-0 text-xs text-ink-faint">
                    used by {n} agent{n === 1 ? "" : "s"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-ink">Coming soon</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COMING_SOON.map((item) => (
            <div key={item.name} className="card p-4 opacity-70">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{item.name}</span>
                <span className="badge bg-surface-raised text-ink-faint">Not yet available</span>
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
