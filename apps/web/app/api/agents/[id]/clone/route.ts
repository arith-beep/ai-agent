import { NextResponse } from "next/server";
import { agentsRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const newName = typeof body.name === "string" && body.name.length > 0 ? body.name : undefined;

  const source = await agentsRepo.getAgentById(ctx.orgId, id);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cloned = await agentsRepo.cloneAgent(ctx.orgId, id, ctx.userId, newName ?? `${source.name} (copy)`);
  return NextResponse.json({ agent: cloned }, { status: 201 });
}
