import { NextResponse } from "next/server";
import { z } from "zod";
import { workflowsRepo } from "@ai-agent/storage";
import { workflowDefinitionSchema } from "@ai-agent/shared-types";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workflows = await workflowsRepo.listWorkflows(ctx.orgId);
  return NextResponse.json({ workflows });
}

const STARTER_DEFINITION = {
  entryNodeId: "trigger-1",
  nodes: [{ id: "trigger-1", type: "trigger" as const, config: { source: "manual" as const } }],
  edges: [],
  layout: { "trigger-1": { x: 80, y: 120 } },
};

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const workflow = await workflowsRepo.createWorkflow({
    orgId: ctx.orgId,
    createdBy: ctx.userId,
    name: parsed.data.name,
    description: parsed.data.description,
    definition: workflowDefinitionSchema.parse(STARTER_DEFINITION),
  });
  return NextResponse.json({ workflow }, { status: 201 });
}
