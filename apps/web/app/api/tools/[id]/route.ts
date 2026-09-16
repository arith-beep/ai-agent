import { NextResponse } from "next/server";
import { z } from "zod";
import { toolsRepo } from "@ai-agent/storage";
import { customToolParamSchema, customToolExecutionConfigSchema, paramsToJsonSchema } from "@ai-agent/shared-types";
import { requireOrgRole, ForbiddenError } from "@ai-agent/auth";
import { getApiContext } from "@/lib/api-session";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  requiresApproval: z.boolean().optional(),
  params: z.array(customToolParamSchema).optional(),
  executionConfig: customToolExecutionConfigSchema.optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await requireOrgRole(ctx.orgId, ctx.userId, "admin");
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const existing = await toolsRepo.getToolById(ctx.orgId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.builtinKey) return NextResponse.json({ error: "Built-in tools can't be edited — only synced." }, { status: 400 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const tool = await toolsRepo.updateCustomTool(ctx.orgId, id, {
    name: parsed.data.name,
    description: parsed.data.description,
    requiresApproval: parsed.data.requiresApproval,
    inputSchema: parsed.data.params ? paramsToJsonSchema(parsed.data.params) : undefined,
    executionConfig: parsed.data.executionConfig,
  });
  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ tool });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await requireOrgRole(ctx.orgId, ctx.userId, "admin");
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const existing = await toolsRepo.getToolById(ctx.orgId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.builtinKey) return NextResponse.json({ error: "Built-in tools can't be deleted — disable them by removing them from agents instead." }, { status: 400 });

  await toolsRepo.deleteTool(ctx.orgId, id);
  return NextResponse.json({ ok: true });
}
