import { requireCurrentContext } from "@/lib/session";
import { salesRepo, toolsRepo } from "@ai-agent/storage";
import { Wrench, Webhook, Clock, Sparkles } from "lucide-react";

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
      <div className="mb-7">
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-fg">Integrations</h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">Tools your sales agents can call, plus what&rsquo;s coming next.</p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-[13.5px] font-medium text-fg">
          <Wrench size={14} strokeWidth={1.75} className="text-fg-faint" />
          Built-in tools
        </h2>
        {builtinTools.length === 0 ? (
          <div className="surface px-6 py-8 text-center text-[13px] text-fg-faint">
            Built-in tools are seeded automatically the first time you open a sales agent&rsquo;s builder.
          </div>
        ) : (
          <div className="surface divide-y divide-hairline-soft">
            {builtinTools.map((tool) => {
              const n = countByToolId.get(tool.id) ?? 0;
              return (
                <div key={tool.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-medium text-fg">{tool.name}</span>
                      <span className="chip bg-sunken text-fg-muted">{tool.category}</span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-fg-faint">{tool.description}</div>
                  </div>
                  <span className="shrink-0 text-[12px] text-fg-faint">
                    used by {n} agent{n === 1 ? "" : "s"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-[13.5px] font-medium text-fg">
          <Webhook size={14} strokeWidth={1.75} className="text-fg-faint" />
          Custom webhook tools
        </h2>
        {customTools.length === 0 ? (
          <div className="surface px-6 py-8 text-center text-[13px] text-fg-faint">
            No custom webhook tools yet. Add one from a sales agent&rsquo;s builder, under its Tools tab.
          </div>
        ) : (
          <div className="surface divide-y divide-hairline-soft">
            {customTools.map((tool) => {
              const n = countByToolId.get(tool.id) ?? 0;
              return (
                <div key={tool.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <span className="text-[13.5px] font-medium text-fg">{tool.name}</span>
                    <div className="mt-0.5 text-[12.5px] text-fg-faint">{tool.description}</div>
                  </div>
                  <span className="shrink-0 text-[12px] text-fg-faint">
                    used by {n} agent{n === 1 ? "" : "s"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-[13.5px] font-medium text-fg">
          <Sparkles size={14} strokeWidth={1.75} className="text-fg-faint" />
          Coming soon
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COMING_SOON.map((item) => (
            <div key={item.name} className="surface p-4 opacity-70">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-medium text-fg">{item.name}</span>
                <span className="chip bg-sunken text-fg-faint">
                  <Clock size={10} strokeWidth={2} />
                  Not yet available
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-fg-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
