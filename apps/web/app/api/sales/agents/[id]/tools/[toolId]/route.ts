import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

const patchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; toolId: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, toolId } = await params;

  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await salesRepo.setAgentToolEnabled(id, toolId, parsed.data.enabled);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; toolId: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, toolId } = await params;

  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await salesRepo.detachTool(id, toolId);
  return NextResponse.json({ ok: true });
}
