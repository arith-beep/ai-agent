import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo, toolsRepo } from "@ai-agent/storage";
import { buildSalesSystemPrompt } from "@ai-agent/sales-agent";
import { salesPlaybookSchema, salesGuardrailsSchema } from "@ai-agent/shared-types";
import { seedSalesTools } from "@ai-agent/tools";
import { AgentStatusBadge } from "../../_components/status-badge";
import { BuilderWorkspace } from "./_components/builder-workspace";
import { DeployButton } from "./_components/deploy-button";

export default async function SalesAgentBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();

  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) notFound();

  await seedSalesTools(ctx.orgId, ctx.userId);
  const [knowledgeSources, attached, allTools] = await Promise.all([
    salesRepo.listKnowledgeSourcesForAgent(id),
    salesRepo.listAgentTools(id),
    toolsRepo.listTools(ctx.orgId),
  ]);
  const attachedIds = new Set(attached.map((a) => a.tool.id));
  const available = allTools.filter((t) => !attachedIds.has(t.id));

  const parsedPlaybook = salesPlaybookSchema.safeParse(agent.playbook);
  const playbook = parsedPlaybook.success
    ? parsedPlaybook.data
    : salesPlaybookSchema.parse({ primaryObjective: "Help visitors and move qualified ones toward a next step." });
  const parsedGuardrails = salesGuardrailsSchema.safeParse(agent.guardrails);
  const guardrails = parsedGuardrails.success ? parsedGuardrails.data : salesGuardrailsSchema.parse({});
  const generatedSystemPrompt = buildSalesSystemPrompt(agent);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/sales/agents" className="text-[12px] text-fg-faint hover:text-fg-muted">
              Sales Agents
            </Link>
            <span className="text-fg-faint">/</span>
            <h1 className="font-display text-[18px] font-semibold tracking-tight text-fg">{agent.name}</h1>
            <AgentStatusBadge status={agent.status} />
          </div>
          <p className="mt-1 text-[13px] text-fg-muted">
            {agent.role} at {agent.companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/sales/agents/${id}/playground`} className="btn-outline gap-1.5">
            <FlaskConical size={14} />
            Test Agent
          </Link>
          <DeployButton agentId={id} status={agent.status} />
        </div>
      </div>

      <BuilderWorkspace
        agentId={id}
        agentName={agent.name}
        identity={{
          name: agent.name,
          companyName: agent.companyName,
          role: agent.role,
          description: agent.description ?? "",
          language: agent.language,
          tone: agent.tone,
          personality: agent.personality,
        }}
        playbook={{
          primaryObjective: playbook.primaryObjective,
          targetCustomer: playbook.targetCustomer ?? "",
          salesProcess: playbook.salesProcess ?? "",
          qualificationCriteria: playbook.qualificationCriteria,
          qualificationQuestions: playbook.qualificationQuestions,
          discoveryQuestions: playbook.discoveryQuestions,
          valueProposition: playbook.valueProposition ?? "",
          productPositioning: playbook.productPositioning ?? "",
          objectionHandling: playbook.objectionHandling,
          cta: playbook.cta ?? "",
          closingBehavior: playbook.closingBehavior ?? "",
          followUpBehavior: playbook.followUpBehavior ?? "",
        }}
        guardrails={guardrails}
        knowledgeSources={knowledgeSources.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))}
        attachedTools={attached}
        availableTools={available}
        generatedSystemPrompt={generatedSystemPrompt}
      />
    </div>
  );
}
