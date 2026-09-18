import { startAgentRunWorker } from "./workers/agent-run";
import { startWorkflowRunWorker } from "./workers/workflow-run";
import { startWorkflowResumeWorker } from "./workers/workflow-resume";
import { startDeliverAgentMessageWorker } from "./workers/deliver-agent-message";
import { startScheduledTriggerWorker } from "./workers/scheduled-trigger";
import { startEmbedMemoryWorker } from "./workers/embed-memory";
import { startIngestKnowledgeDocumentWorker } from "./workers/ingest-knowledge-document";
import { startIngestSalesKnowledgeWorker } from "./workers/ingest-sales-knowledge";

const workers = [
  startAgentRunWorker(),
  startWorkflowRunWorker(),
  startWorkflowResumeWorker(),
  startDeliverAgentMessageWorker(),
  startScheduledTriggerWorker(),
  startEmbedMemoryWorker(),
  startIngestKnowledgeDocumentWorker(),
  startIngestSalesKnowledgeWorker(),
];

console.log(`AI Agent Platform worker started: ${workers.length} queue processors running.`);

async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
