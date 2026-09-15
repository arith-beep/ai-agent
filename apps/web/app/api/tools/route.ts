import { NextResponse } from "next/server";
import { toolsRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tools = await toolsRepo.listTools(ctx.orgId);
  return NextResponse.json({ tools });
}
