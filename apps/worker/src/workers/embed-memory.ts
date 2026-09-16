import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, type EmbedMemoryJobData } from "@ai-agent/queue";
import { memoryRepo } from "@ai-agent/storage";
import { embedPendingMessage } from "@ai-agent/memory";

export function startEmbedMemoryWorker(): Worker<EmbedMemoryJobData> {
  const worker = new Worker<EmbedMemoryJobData>(
    QUEUE_NAMES.embedMemory,
    async (job) => {
      const { threadId, messageId } = job.data;
      const [message, orgId] = await Promise.all([memoryRepo.getMessageById(messageId), memoryRepo.getThreadOrgId(threadId)]);
      if (!message || !orgId) return; // message or thread was deleted since enqueue — nothing to embed
      const text = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
      if (text.trim().length === 0) return;
      try {
        await embedPendingMessage(threadId, messageId, orgId, text);
      } catch (error) {
        // Embedding is explicitly best-effort (semantic recall, tier 3) — the message itself is
        // already durably stored (tier 1) regardless. Swallowing here, rather than letting BullMQ
        // retry, matters most for a missing-API-key org: that failure is permanent, so retrying
        // would just repeat it 5x with exponential backoff on every single message, forever.
        console.error(`[embed-memory] failed to embed message ${messageId}:`, error instanceof Error ? error.message : error);
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[embed-memory] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
