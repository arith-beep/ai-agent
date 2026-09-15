import { NextResponse } from "next/server";
import { workflowsRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const workflow = await workflowsRepo.getWorkflow(id);
  if (!workflow || workflow.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const runs = await workflowsRepo.listWorkflowRuns(id);
  return NextResponse.json({ runs });
}
