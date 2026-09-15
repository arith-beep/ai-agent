import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function writeAuditLog(input: {
  orgId: string;
  actorType: "human" | "agent" | "system";
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(schema.auditLogs).values(input);
}

export async function listAuditLogs(orgId: string, limit = 100) {
  const db = getDb();
  return db.query.auditLogs.findMany({
    where: eq(schema.auditLogs.orgId, orgId),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit,
  });
}
