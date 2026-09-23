import { NextResponse } from "next/server";
import { salesRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [overview, conversationsPerDay, leadFunnel, toolUsage] = await Promise.all([
    salesRepo.getOverviewStats(ctx.orgId),
    salesRepo.getConversationsPerDay(ctx.orgId),
    salesRepo.getLeadFunnel(ctx.orgId),
    salesRepo.getSalesToolUsage(ctx.orgId),
  ]);

  return NextResponse.json({ overview, conversationsPerDay, leadFunnel, toolUsage });
}
