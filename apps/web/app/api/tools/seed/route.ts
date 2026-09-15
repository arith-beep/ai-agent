import { NextResponse } from "next/server";
import { seedBuiltinTools } from "@ai-agent/tools";
import { getApiContext } from "@/lib/api-session";

export async function POST() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tools = await seedBuiltinTools(ctx.orgId, ctx.userId);
  return NextResponse.json({ tools }, { status: 201 });
}
