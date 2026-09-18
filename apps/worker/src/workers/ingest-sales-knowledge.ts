import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, type IngestSalesKnowledgeSourceJobData } from "@ai-agent/queue";
import { salesRepo } from "@ai-agent/storage";
import { ingestSalesKnowledgeSource } from "@ai-agent/sales-agent";

export function startIngestSalesKnowledgeWorker(): Worker<IngestSalesKnowledgeSourceJobData> {
  const worker = new Worker<IngestSalesKnowledgeSourceJobData>(
    QUEUE_NAMES.ingestSalesKnowledgeSource,
    async (job) => {
      const source = await salesRepo.getKnowledgeSource(job.data.sourceId);
      if (!source) return; // source was deleted since enqueue
      await ingestSalesKnowledgeSource(source.orgId, job.data.sourceId);
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[ingest-sales-knowledge-source] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
