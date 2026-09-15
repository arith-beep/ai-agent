import { requireCurrentContext } from "@/lib/session";
import { toolsRepo, knowledgeRepo } from "@ai-agent/storage";
import { AgentForm } from "../_components/agent-form";

export default async function NewAgentPage() {
  const ctx = await requireCurrentContext();
  const [tools, knowledgeBases] = await Promise.all([toolsRepo.listTools(ctx.orgId), knowledgeRepo.listKnowledgeBases(ctx.orgId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Create agent</h1>
        <p className="mt-1 text-sm text-ink-muted">Configure a new AI agent for your organization.</p>
      </div>
      <AgentForm tools={tools} knowledgeBases={knowledgeBases} />
    </div>
  );
}
