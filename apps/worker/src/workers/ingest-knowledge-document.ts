import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, type IngestKnowledgeDocumentJobData } from "@ai-agent/queue";
import { knowledgeRepo } from "@ai-agent/storage";
import { ingestDocument } from "@ai-agent/rag";

export function startIngestKnowledgeDocumentWorker(): Worker<IngestKnowledgeDocumentJobData> {
  const worker = new Worker<IngestKnowledgeDocumentJobData>(
    QUEUE_NAMES.ingestKnowledgeDocument,
    async (job) => {
      const orgId = await knowledgeRepo.getDocumentOrgId(job.data.documentId);
      if (!orgId) return; // document was deleted since enqueue
      await ingestDocument(orgId, job.data.documentId);
    },
    { connection: getRedisConnection(), concurrency: 3 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[ingest-knowledge-document] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
