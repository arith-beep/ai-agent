import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db";

export async function getOrCreateThread(agentId: string, opts: { userId?: string; resourceId?: string; threadId?: string }) {
  const db = getDb();
  if (opts.threadId) {
    const existing = await db.query.memoryThreads.findFirst({ where: eq(schema.memoryThreads.id, opts.threadId) });
    if (existing) return existing;
  }
  const [thread] = await db
    .insert(schema.memoryThreads)
    .values({ agentId, userId: opts.userId, resourceId: opts.resourceId })
    .returning();
  if (!thread) throw new Error("Failed to create memory thread");
  return thread;
}

export async function appendMessage(threadId: string, role: "user" | "assistant" | "tool" | "system", content: unknown, toolCalls?: unknown) {
  const db = getDb();
  const [message] = await db.insert(schema.memoryMessages).values({ threadId, role, content, toolCalls }).returning();
  if (!message) throw new Error("Failed to append message");
  return message;
}

export async function listRecentMessages(threadId: string, limit = 20) {
  const db = getDb();
  const rows = await db.query.memoryMessages.findMany({
    where: eq(schema.memoryMessages.threadId, threadId),
    orderBy: (m, { desc: d }) => [d(m.createdAt)],
    limit,
  });
  return rows.reverse();
}

export async function getWorkingMemory(threadId: string) {
  const db = getDb();
  return db.query.memoryWorking.findFirst({ where: eq(schema.memoryWorking.threadId, threadId) });
}

export async function upsertWorkingMemory(threadId: string, data: Record<string, unknown>, resourceId?: string) {
  const db = getDb();
  const existing = await getWorkingMemory(threadId);
  if (existing) {
    const [updated] = await db
      .update(schema.memoryWorking)
      .set({ data, updatedAt: new Date() })
      .where(eq(schema.memoryWorking.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(schema.memoryWorking).values({ threadId, resourceId, data }).returning();
  return created;
}

export async function storeMessageEmbedding(messageId: string, embedding: number[]) {
  const db = getDb();
  await db.insert(schema.memoryMessageEmbeddings).values({ messageId, embedding });
}

/** Semantic recall: top-K most similar past messages in this thread. */
export async function searchSimilarMessages(threadId: string, queryEmbedding: number[], topK = 5) {
  const db = getDb();
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;
  return db
    .select({
      message: schema.memoryMessages,
      distance: sql<number>`${schema.memoryMessageEmbeddings.embedding} <=> ${vectorLiteral}::vector`,
    })
    .from(schema.memoryMessageEmbeddings)
    .innerJoin(schema.memoryMessages, eq(schema.memoryMessages.id, schema.memoryMessageEmbeddings.messageId))
    .where(eq(schema.memoryMessages.threadId, threadId))
    .orderBy(sql`${schema.memoryMessageEmbeddings.embedding} <=> ${vectorLiteral}::vector`)
    .limit(topK);
}
