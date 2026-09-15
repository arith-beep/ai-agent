import { NextResponse } from "next/server";
import { agentsRepo } from "@ai-agent/storage";
import { createAgentInputSchema } from "@ai-agent/shared-types";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agents = await agentsRepo.listAgents(ctx.orgId);
  return NextResponse.json({ agents });
}

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createAgentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const agent = await agentsRepo.createAgent(ctx.orgId, ctx.userId, parsed.data);
  return NextResponse.json({ agent }, { status: 201 });
}
