import { NextResponse } from "next/server";
import { salesRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

/** Starts a fresh test conversation for this agent — the Playground's "New test session". */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conversation = await salesRepo.createConversation({ orgId: ctx.orgId, agentId: id, channel: "playground", isTest: true });
  return NextResponse.json({ conversation }, { status: 201 });
}
