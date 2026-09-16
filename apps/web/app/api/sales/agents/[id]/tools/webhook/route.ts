import { NextResponse } from "next/server";
import { salesRepo, toolsRepo } from "@ai-agent/storage";
import { createCustomToolInputSchema, paramsToJsonSchema } from "@ai-agent/shared-types";
import { getApiContext } from "@/lib/api-session";

/** Creates a custom webhook tool and attaches it to this agent in one step — the Tools builder step's quick "Add Webhook" action. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = createCustomToolInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const tool = await toolsRepo.createTool(ctx.orgId, ctx.userId, {
    name: parsed.data.name,
    description: parsed.data.description,
    category: "custom",
    requiresApproval: parsed.data.requiresApproval,
    inputSchema: paramsToJsonSchema(parsed.data.params),
    executionConfig: parsed.data.executionConfig,
  });
  if (!tool) return NextResponse.json({ error: "Failed to create webhook tool" }, { status: 500 });

  await salesRepo.attachTool(id, tool.id);
  return NextResponse.json({ tool }, { status: 201 });
}
