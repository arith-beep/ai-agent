import { NextResponse } from "next/server";
import { toolsRepo } from "@ai-agent/storage";
import { createCustomToolInputSchema, paramsToJsonSchema } from "@ai-agent/shared-types";
import { requireOrgRole, ForbiddenError } from "@ai-agent/auth";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tools = await toolsRepo.listTools(ctx.orgId);
  return NextResponse.json({ tools });
}

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireOrgRole(ctx.orgId, ctx.userId, "admin");
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const body = await request.json();
  const parsed = createCustomToolInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const tool = await toolsRepo.createTool(ctx.orgId, ctx.userId, {
    name: parsed.data.name,
    description: parsed.data.description,
    category: parsed.data.category,
    requiresApproval: parsed.data.requiresApproval,
    inputSchema: paramsToJsonSchema(parsed.data.params),
    executionConfig: parsed.data.executionConfig,
  });
  return NextResponse.json({ tool }, { status: 201 });
}
