import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function getOrCreateUserByEmail(email: string, name?: string) {
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return existing;
  const [created] = await db.insert(schema.users).values({ email, name }).returning();
  if (!created) throw new Error("Failed to create user");
  return created;
}

export async function getUserByEmail(email: string) {
  const db = getDb();
  return db.query.users.findFirst({ where: eq(schema.users.email, email) });
}

export async function getUserById(userId: string) {
  const db = getDb();
  return db.query.users.findFirst({ where: eq(schema.users.id, userId) });
}

export async function createUserWithPassword(email: string, name: string, passwordHash: string) {
  const db = getDb();
  const [created] = await db.insert(schema.users).values({ email, name, passwordHash }).returning();
  if (!created) throw new Error("Failed to create user");
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
    .where(eq(schema.orgMembers.userId, userId))
    // requireCurrentContext() treats memberships[0] as "current" (a documented MVP
    // simplification — no org switcher yet) — without an explicit order, Postgres can
    // return rows in an arbitrary order unrelated to when the membership was created.
    .orderBy(schema.orgMembers.createdAt);
}

export async function getMembership(orgId: string, userId: string) {
  const db = getDb();
  return db.query.orgMembers.findFirst({
    where: and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.userId, userId)),
  });
}

export async function listOrgMembers(orgId: string) {
  const db = getDb();
  return db
    .select({ userId: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.orgMembers.role })
    .from(schema.orgMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.orgMembers.userId))
    .where(eq(schema.orgMembers.orgId, orgId));
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const db = getDb();
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId));
}

export async function createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
  const db = getDb();
  const [row] = await db.insert(schema.passwordResetTokens).values({ userId, tokenHash, expiresAt }).returning();
  return row;
}

/** Returns the token row only if it exists, hasn't been used, and hasn't expired. */
export async function getValidPasswordResetToken(tokenHash: string) {
  const db = getDb();
  const row = await db.query.passwordResetTokens.findFirst({ where: eq(schema.passwordResetTokens.tokenHash, tokenHash) });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function markPasswordResetTokenUsed(id: string) {
  const db = getDb();
  await db.update(schema.passwordResetTokens).set({ usedAt: new Date() }).where(eq(schema.passwordResetTokens.id, id));
}

export async function listDepartments(orgId: string) {
  const db = getDb();
  return db.query.departments.findMany({ where: eq(schema.departments.orgId, orgId) });
}
