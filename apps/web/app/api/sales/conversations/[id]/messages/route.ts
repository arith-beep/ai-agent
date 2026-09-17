import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepo } from "@ai-agent/storage";
import { runConversationTurn } from "@ai-agent/sales-agent";
import { getApiContext } from "@/lib/api-session";

// A conversation turn can involve multiple tool-calling round trips to the LLM
// (see MAX_TOOL_STEPS in packages/sales-agent) — give it more room than Vercel's default.
export const maxDuration = 60;

const sendSchema = z.object({ message: z.string().min(1).max(4000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const conversation = await salesRepo.getConversation(ctx.orgId, id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.status !== "active") {
    return NextResponse.json({ error: `This conversation is ${conversation.status} and can no longer be replied to.` }, { status: 400 });
  }

  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const result = await runConversationTurn({
    orgId: ctx.orgId,
    agentId: conversation.agentId,
    conversationId: id,
    userMessage: parsed.data.message,
  });

  return NextResponse.json(result);
}

/** "Reset conversation" / "Clear history" in the Playground: wipes messages and lead linkage, keeps the same conversation id. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const conversation = await salesRepo.getConversation(ctx.orgId, id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!conversation.isTest) return NextResponse.json({ error: "Only test conversations can be reset." }, { status: 400 });

  await salesRepo.clearConversationMessages(id);
  return NextResponse.json({ ok: true });
}
