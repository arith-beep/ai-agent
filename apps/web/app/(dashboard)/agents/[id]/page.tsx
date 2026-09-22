import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { agentsRepo, toolsRepo, knowledgeRepo, runsRepo, tenancyRepo } from "@ai-agent/storage";
import { AgentForm } from "../_components/agent-form";
import { AgentActions } from "../_components/agent-actions";
import { AgentConnections } from "../_components/agent-connections";

const STATUS_STYLES: Record<string, string> = {
  enabled: "bg-success/15 text-success",
  disabled: "bg-ink-faint/15 text-ink-faint",
  draft: "bg-warning/15 text-warning",
};

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const config = await agentsRepo.getAgentRuntimeConfig(ctx.orgId, id);
  if (!config) notFound();

  const [allTools, allKbs, allAgents, connections, runs, orgMembers] = await Promise.all([
    toolsRepo.listTools(ctx.orgId),
    knowledgeRepo.listKnowledgeBases(ctx.orgId),
    agentsRepo.listAgents(ctx.orgId),
    agentsRepo.listConnections(id),
    runsRepo.listRunsForAgent(id, 10),
    tenancyRepo.listOrgMembers(ctx.orgId),
  ]);

  const { agent } = config;
  const otherAgents = allAgents.filter((a) => a.id !== id).map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{agent.name}</h1>
            <span className={`badge ${STATUS_STYLES[agent.status]}`}>{agent.status}</span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{agent.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/playground/${agent.id}`} className="btn-primary">
            Open Playground
          </Link>
          <AgentActions agentId={agent.id} status={agent.status} />
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-medium text-ink">Connections</h2>
        <AgentConnections
          agentId={agent.id}
          connections={connections.map((c) => ({ connectedAgent: c.connectedAgent, relationshipType: c.relationshipType }))}
          otherAgents={otherAgents}
        />
      </div>

      <div className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-ink">Recent runs</div>
        <div className="divide-y divide-border-subtle">
          {runs.length === 0 && <div className="px-5 py-6 text-sm text-ink-faint">No runs yet.</div>}
          {runs.map((run) => (
            <Link key={run.id} href={`/runs/${run.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-surface-raised">
              <span className="text-ink">{run.status}</span>
              <span className="text-ink-faint">{new Date(run.startedAt).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-ink">Configuration</h2>
        <AgentForm
          initial={{
            id: agent.id,
            name: agent.name,
            role: agent.role,
            description: agent.description ?? undefined,
            objective: agent.objective ?? undefined,
            systemPrompt: agent.systemPrompt,
            // This builder's provider dropdown only offers the three original providers;
            // OpenRouter isn't wired into it, so fall back to undefined (defaults to
            // "openai" in the form) rather than passing a value it can't render.
            modelProvider: agent.modelProvider === "openrouter" ? undefined : agent.modelProvider,
            modelName: agent.modelName,
            temperature: agent.temperature,
            maxTokens: agent.maxTokens,
            toolIds: config.tools.map((t) => t.id),
            knowledgeBaseIds: config.knowledgeBases.map((k) => k.id),
            permissions: config.permissions.map((p) => ({
              actionPattern: p.actionPattern,
              requiresApproval: p.requiresApproval,
              approverRole: p.approverRole ?? undefined,
            })),
            humanManagerId: agent.humanManagerId ?? undefined,
          }}
          tools={allTools}
          knowledgeBases={allKbs}
          orgMembers={orgMembers}
        />
      </div>
    </div>
  );
}
