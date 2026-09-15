import { eq, and } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@ai-agent/crypto";
import type { ModelProvider } from "@ai-agent/shared-types";
import { getDb, schema } from "../db";

export async function upsertModelCredential(orgId: string, createdBy: string, provider: ModelProvider, apiKey: string) {
  const db = getDb();
  const encrypted = encryptSecret(apiKey);
  const existing = await db.query.modelCredentials.findFirst({
    where: and(eq(schema.modelCredentials.orgId, orgId), eq(schema.modelCredentials.provider, provider)),
  });
  if (existing) {
    const [updated] = await db
      .update(schema.modelCredentials)
      .set({ encryptedApiKey: encrypted })
      .where(eq(schema.modelCredentials.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(schema.modelCredentials).values({ orgId, provider, encryptedApiKey: encrypted, createdBy }).returning();
  return created;
}

export async function getDecryptedApiKey(orgId: string, provider: ModelProvider): Promise<string | undefined> {
  const db = getDb();
  const credential = await db.query.modelCredentials.findFirst({
    where: and(eq(schema.modelCredentials.orgId, orgId), eq(schema.modelCredentials.provider, provider)),
  });
  if (!credential) return undefined;
  return decryptSecret(credential.encryptedApiKey);
}

export async function listConfiguredProviders(orgId: string) {
  const db = getDb();
  const rows = await db.query.modelCredentials.findMany({ where: eq(schema.modelCredentials.orgId, orgId) });
  return rows.map((r) => ({ provider: r.provider, createdAt: r.createdAt }));
}
