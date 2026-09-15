import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, type AgentRunJobData } from "@ai-agent/queue";
import { executeAgentRun } from "@ai-agent/agent-runtime";

export function startAgentRunWorker(): Worker<AgentRunJobData> {
  const worker = new Worker<AgentRunJobData>(
    QUEUE_NAMES.agentRun,
    async (job) => {
      await executeAgentRun(job.data);
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[agent-run] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
