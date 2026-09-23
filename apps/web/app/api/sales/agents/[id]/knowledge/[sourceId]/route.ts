import { NextResponse } from "next/server";
import { salesRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; sourceId: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sourceId } = await params;

  const source = await salesRepo.getKnowledgeSource(sourceId);
  if (!source || source.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await salesRepo.deleteKnowledgeSource(ctx.orgId, sourceId);
  return NextResponse.json({ ok: true });
}
