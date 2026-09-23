import { NextResponse } from "next/server";
import { salesRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const handoff = await salesRepo.resolveHandoff(ctx.orgId, id, ctx.userId);
  if (!handoff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ handoff });
}
