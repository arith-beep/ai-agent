import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepo, toolsRepo } from "@ai-agent/storage";
import { seedSalesTools } from "@ai-agent/tools";
import { getApiContext } from "@/lib/api-session";

const attachSchema = z.object({ toolId: z.string().uuid(), config: z.record(z.string(), z.unknown()).optional() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await seedSalesTools(ctx.orgId, ctx.userId);
  const [attached, allTools] = await Promise.all([salesRepo.listAgentTools(id), toolsRepo.listTools(ctx.orgId)]);
  const attachedIds = new Set(attached.map((a) => a.tool.id));
  const available = allTools.filter((t) => !attachedIds.has(t.id));

  return NextResponse.json({ attached, available });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = attachSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const tool = await toolsRepo.getToolById(ctx.orgId, parsed.data.toolId);
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

  const attachment = await salesRepo.attachTool(id, parsed.data.toolId, parsed.data.config);
  return NextResponse.json({ attachment }, { status: 201 });
}
