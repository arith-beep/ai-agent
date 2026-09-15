import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { agentsRepo } from "@ai-agent/storage";
import { Playground } from "./_components/playground";

export default async function PlaygroundPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const ctx = await requireCurrentContext();
  const agent = await agentsRepo.getAgentById(ctx.orgId, agentId);
  if (!agent) notFound();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-ink">Playground</h1>
      <Playground agentId={agent.id} agentName={agent.name} />
    </div>
  );
}
