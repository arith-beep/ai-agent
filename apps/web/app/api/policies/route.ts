import { NextResponse } from "next/server";
import { z } from "zod";
import { policyRepo } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";
import { requireOrgRole, ForbiddenError } from "@ai-agent/auth";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const policies = await policyRepo.listPoliciesForOrg(ctx.orgId);
  return NextResponse.json({ policies });
}

const createPolicySchema = z.object({
  name: z.string().min(1),
  actionPattern: z.string().min(1),
  requiresApproval: z.boolean(),
  approverRole: z.enum(["owner", "admin", "manager", "member", "viewer"]).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireOrgRole(ctx.orgId, ctx.userId, "admin");
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const body = await request.json();
  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const policy = await policyRepo.createPolicy({ orgId: ctx.orgId, ...parsed.data });
  return NextResponse.json({ policy }, { status: 201 });
}
