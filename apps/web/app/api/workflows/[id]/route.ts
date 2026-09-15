import { NextResponse } from "next/server";
import { z } from "zod";
import { workflowsRepo, schema } from "@ai-agent/storage";
import { workflowDefinitionSchema } from "@ai-agent/shared-types";
import { getApiContext } from "@/lib/api-session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const workflow = await workflowsRepo.getWorkflow(id);
  if (!workflow || workflow.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workflow });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  definition: workflowDefinitionSchema.optional(),
  status: z.enum(schema.workflowStatusEnum.enumValues).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await workflowsRepo.getWorkflow(id);
  if (!existing || existing.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const workflow = await workflowsRepo.updateWorkflow(id, parsed.data);
  return NextResponse.json({ workflow });
}
