import { notFound } from "next/navigation";
import { requireCurrentContext } from "@/lib/session";
import { salesRepo } from "@ai-agent/storage";
import { Playground } from "./_components/playground";

export default async function SalesPlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCurrentContext();
  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) notFound();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-ink">Test Playground — {agent.name}</h1>
      <Playground agentId={agent.id} agentName={agent.name} modelLabel={`${agent.modelProvider}/${agent.modelName}`} />
    </div>
  );
}
