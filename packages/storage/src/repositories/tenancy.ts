import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function getOrCreateUserByEmail(email: string, name?: string) {
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return existing;
  const [created] = await db.insert(schema.users).values({ email, name }).returning();
  return created;
}

export async function createOrganization(input: { name: string; slug: string; ownerUserId: string }) {
  const db = getDb();
  const [org] = await db.insert(schema.organizations).values({ name: input.name, slug: input.slug }).returning();
  if (!org) throw new Error("Failed to create organization");
  await db.insert(schema.orgMembers).values({ orgId: org.id, userId: input.ownerUserId, role: "owner" });
  return org;
}

export async function listOrgsForUser(userId: string) {
  const db = getDb();
  return db
    .select({ org: schema.organizations, role: schema.orgMembers.role })
    .from(schema.orgMembers)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.orgMembers.orgId))
    .where(eq(schema.orgMembers.userId, userId));
}

export async function getMembership(orgId: string, userId: string) {
  const db = getDb();
  return db.query.orgMembers.findFirst({
    where: and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.userId, userId)),
  });
}

export async function listDepartments(orgId: string) {
  const db = getDb();
  return db.query.departments.findMany({ where: eq(schema.departments.orgId, orgId) });
}
