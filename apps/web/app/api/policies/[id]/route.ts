import { NextResponse } from "next/server";
import { policyRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";
import { requireOrgRole, ForbiddenError } from "@ai-agent/auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await requireOrgRole(ctx.orgId, ctx.userId, "admin");
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  await policyRepo.deletePolicy(ctx.orgId, id);
  return NextResponse.json({ ok: true });
}
