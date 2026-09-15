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
      await embedPendingMessage(threadId, messageId, orgId, text);
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[embed-memory] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
