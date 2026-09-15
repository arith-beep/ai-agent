import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function listPoliciesForOrg(orgId: string) {
  const db = getDb();
  return db.query.policies.findMany({ where: eq(schema.policies.orgId, orgId) });
}

export async function createPolicy(input: {
  orgId: string;
  name: string;
  actionPattern: string;
  requiresApproval: boolean;
  approverRole?: string;
  conditions?: Record<string, unknown>;
}) {
  const db = getDb();
  const [policy] = await db.insert(schema.policies).values(input).returning();
  return policy;
}

export async function createApproval(input: {
  orgId: string;
  actionType: string;
  requestedByType: "agent";
  requestedById: string;
  workflowRunId?: string;
  toolExecutionId?: string;
  payload: Record<string, unknown>;
  policyId?: string;
}) {
  const db = getDb();
  const [approval] = await db.insert(schema.approvals).values({ ...input, status: "pending" }).returning();
  return approval;
}

export async function resolveApproval(approvalId: string, approverId: string, decision: "approved" | "rejected") {
  const db = getDb();
  const [updated] = await db
    .update(schema.approvals)
    .set({ status: decision, approverId, resolvedAt: new Date() })
    .where(eq(schema.approvals.id, approvalId))
    .returning();
  return updated;
}

export async function getApproval(approvalId: string) {
  const db = getDb();
  return db.query.approvals.findFirst({ where: eq(schema.approvals.id, approvalId) });
}

export async function listPendingApprovals(orgId: string) {
  const db = getDb();
  return db.query.approvals.findMany({
    where: and(eq(schema.approvals.orgId, orgId), eq(schema.approvals.status, "pending")),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });
}
