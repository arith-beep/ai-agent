import { NextResponse } from "next/server";
import { salesRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function GET(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const handoffs = await salesRepo.listHandoffs(ctx.orgId, status);
  return NextResponse.json({ handoffs });
}
