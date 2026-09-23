import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
      <div className="mb-4 flex items-center gap-2">
        <Link href={`/sales/agents/${id}`} className="flex items-center gap-1 text-[12.5px] text-fg-faint hover:text-fg-muted">
          <ChevronLeft size={14} />
          {agent.name}
        </Link>
      </div>
      <h1 className="mb-4 font-display text-[18px] font-semibold tracking-tight text-fg">Test Playground</h1>
      <Playground agentId={agent.id} agentName={agent.name} modelLabel={`${agent.modelProvider}/${agent.modelName}`} />
    </div>
  );
}
