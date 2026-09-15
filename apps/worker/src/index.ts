import { startAgentRunWorker } from "./workers/agent-run";
import { startWorkflowResumeWorker } from "./workers/workflow-resume";
import { startDeliverAgentMessageWorker } from "./workers/deliver-agent-message";
import { startScheduledTriggerWorker } from "./workers/scheduled-trigger";
import { startEmbedMemoryWorker } from "./workers/embed-memory";
import { startIngestKnowledgeDocumentWorker } from "./workers/ingest-knowledge-document";

const workers = [
  startAgentRunWorker(),
  startWorkflowResumeWorker(),
  startDeliverAgentMessageWorker(),
  startScheduledTriggerWorker(),
  startEmbedMemoryWorker(),
  startIngestKnowledgeDocumentWorker(),
];

console.log(`AI Agent Platform worker started: ${workers.length} queue processors running.`);

async function shutdown() {
  console.log("Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
