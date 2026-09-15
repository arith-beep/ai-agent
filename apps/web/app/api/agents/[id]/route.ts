import { NextResponse } from "next/server";
import { agentsRepo } from "@ai-agent/storage";
import { updateAgentInputSchema } from "@ai-agent/shared-types";
import { getApiContext } from "@/lib/api-session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const config = await agentsRepo.getAgentRuntimeConfig(ctx.orgId, id);
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(config);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json();
  const parsed = updateAgentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const agent = await agentsRepo.updateAgent(ctx.orgId, id, parsed.data);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await agentsRepo.deleteAgent(ctx.orgId, id);
  return NextResponse.json({ ok: true });
}
