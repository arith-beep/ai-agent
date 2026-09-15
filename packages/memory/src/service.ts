import { memoryRepo } from "@ai-agent/storage";
import { embedText } from "@ai-agent/model-providers";
import { getQueues } from "@ai-agent/queue";

export interface MemoryThreadRef {
  agentId: string;
  userId?: string;
  resourceId?: string;
  threadId?: string;
}

export async function getOrCreateThread(ref: MemoryThreadRef) {
  return memoryRepo.getOrCreateThread(ref.agentId, { userId: ref.userId, resourceId: ref.resourceId, threadId: ref.threadId });
}

/**
 * Appends a message to raw conversation history (tier 1) and, for
 * user/assistant turns, enqueues best-effort embedding for semantic recall
 * (tier 3) — embedding never blocks the caller, per docs/architecture/04.
 */
export async function appendMessage(
  threadId: string,
  role: "user" | "assistant" | "tool" | "system",
  content: unknown,
  toolCalls?: unknown,
) {
  const message = await memoryRepo.appendMessage(threadId, role, content, toolCalls);
  if (role === "user" || role === "assistant") {
    const queues = getQueues();
    await queues.embedMemory.add("embed", { threadId, messageId: message.id });
  }
  return message;
}

export async function getRecentHistory(threadId: string, limit = 20) {
  return memoryRepo.listRecentMessages(threadId, limit);
}

export async function getWorkingMemory(threadId: string) {
  const record = await memoryRepo.getWorkingMemory(threadId);
  return record?.data ?? {};
}

export async function updateWorkingMemory(threadId: string, data: Record<string, unknown>, resourceId?: string) {
  return memoryRepo.upsertWorkingMemory(threadId, data, resourceId);
}

/** Called by the embed-memory worker job — actually computes and stores the embedding (tier 3). */
export async function embedPendingMessage(threadId: string, messageId: string, orgId: string, text: string) {
  const embedding = await embedText(orgId, text);
  await memoryRepo.storeMessageEmbedding(messageId, embedding);
}

export async function searchSemanticMemory(orgId: string, threadId: string, query: string, topK = 5) {
  const queryEmbedding = await embedText(orgId, query);
  return memoryRepo.searchSimilarMessages(threadId, queryEmbedding, topK);
}
