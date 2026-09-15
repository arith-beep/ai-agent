import { NextResponse } from "next/server";
import { policyRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const approvals = await policyRepo.listPendingApprovals(ctx.orgId);
  return NextResponse.json({ approvals });
}
