import { eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function createKnowledgeBase(input: {
  orgId: string;
  createdBy: string;
  name: string;
  description?: string;
  sourceType: (typeof schema.knowledgeSourceTypeEnum.enumValues)[number];
  config?: Record<string, unknown>;
}) {
  const db = getDb();
  const [kb] = await db
    .insert(schema.knowledgeBases)
    .values({
      orgId: input.orgId,
      name: input.name,
      description: input.description,
      sourceType: input.sourceType,
      config: input.config ?? {},
      createdBy: input.createdBy,
    })
    .returning();
  return kb;
}

export async function listKnowledgeBases(orgId: string) {
  const db = getDb();
  return db.query.knowledgeBases.findMany({ where: eq(schema.knowledgeBases.orgId, orgId) });
}

export async function getKnowledgeBaseById(knowledgeBaseId: string) {
  const db = getDb();
  return db.query.knowledgeBases.findFirst({ where: eq(schema.knowledgeBases.id, knowledgeBaseId) });
}

export async function getDocument(documentId: string) {
  const db = getDb();
  return db.query.knowledgeDocuments.findFirst({ where: eq(schema.knowledgeDocuments.id, documentId) });
}

export async function listDocuments(knowledgeBaseId: string) {
  const db = getDb();
  return db.query.knowledgeDocuments.findMany({ where: eq(schema.knowledgeDocuments.knowledgeBaseId, knowledgeBaseId) });
}

/** Resolves the organization a document belongs to via its knowledge base. */
export async function getDocumentOrgId(documentId: string): Promise<string | undefined> {
  const db = getDb();
  const [row] = await db
    .select({ orgId: schema.knowledgeBases.orgId })
    .from(schema.knowledgeDocuments)
    .innerJoin(schema.knowledgeBases, eq(schema.knowledgeBases.id, schema.knowledgeDocuments.knowledgeBaseId))
    .where(eq(schema.knowledgeDocuments.id, documentId));
  return row?.orgId;
}

export async function createDocument(knowledgeBaseId: string, sourceUri: string, metadata?: Record<string, unknown>) {
  const db = getDb();
  const [doc] = await db
    .insert(schema.knowledgeDocuments)
    .values({ knowledgeBaseId, sourceUri, metadata: metadata ?? {}, status: "pending" })
    .returning();
  return doc;
}

export async function updateDocumentStatus(
  documentId: string,
  status: (typeof schema.knowledgeDocumentStatusEnum.enumValues)[number],
  errorMessage?: string,
) {
  const db = getDb();
  await db.update(schema.knowledgeDocuments).set({ status, errorMessage }).where(eq(schema.knowledgeDocuments.id, documentId));
}

export async function insertChunks(
  documentId: string,
  chunks: Array<{ content: string; embedding: number[]; metadata?: Record<string, unknown>; chunkIndex: number }>,
) {
  const db = getDb();
  if (chunks.length === 0) return [];
  return db
    .insert(schema.knowledgeChunks)
    .values(
      chunks.map((c) => ({
        documentId,
        content: c.content,
        embedding: c.embedding,
        metadata: c.metadata ?? {},
        chunkIndex: c.chunkIndex,
      })),
    )
    .returning();
}

/** Cosine-similarity search across all chunks belonging to the given knowledge bases. */
export async function searchChunks(knowledgeBaseIds: string[], queryEmbedding: number[], topK = 5) {
  const db = getDb();
  if (knowledgeBaseIds.length === 0) return [];
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const documentIds = await db
    .select({ id: schema.knowledgeDocuments.id })
    .from(schema.knowledgeDocuments)
    .where(inArray(schema.knowledgeDocuments.knowledgeBaseId, knowledgeBaseIds));
  const docIdList = documentIds.map((d) => d.id);
  if (docIdList.length === 0) return [];

  const rows = await db
    .select({
      id: schema.knowledgeChunks.id,
      content: schema.knowledgeChunks.content,
      metadata: schema.knowledgeChunks.metadata,
      documentId: schema.knowledgeChunks.documentId,
      distance: sql<number>`${schema.knowledgeChunks.embedding} <=> ${vectorLiteral}::vector`,
    })
    .from(schema.knowledgeChunks)
    .where(inArray(schema.knowledgeChunks.documentId, docIdList))
    .orderBy(sql`${schema.knowledgeChunks.embedding} <=> ${vectorLiteral}::vector`)
    .limit(topK);

  return rows.map((r) => ({ ...r, score: 1 - r.distance }));
}
