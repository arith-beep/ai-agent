import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, type DeliverAgentMessageJobData } from "@ai-agent/queue";
import { deliverMessage, escalateFailedDelivery } from "@ai-agent/message-bus";

export function startDeliverAgentMessageWorker(): Worker<DeliverAgentMessageJobData> {
  const worker = new Worker<DeliverAgentMessageJobData>(
    QUEUE_NAMES.deliverAgentMessage,
    async (job) => {
      await deliverMessage(job.data.messageId);
    },
    { connection: getRedisConnection(), concurrency: 10 },
  );
  worker.on("failed", async (job, err) => {
    console.error(`[deliver-agent-message] job ${job?.id} failed:`, err.message);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await escalateFailedDelivery(job.data.messageId).catch((escalationError) => {
        console.error(`[deliver-agent-message] failed to escalate ${job.data.messageId}:`, escalationError);
      });
    }
  });
  return worker;
}
