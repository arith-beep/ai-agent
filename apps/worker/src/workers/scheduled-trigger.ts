import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, type ScheduledTriggerJobData } from "@ai-agent/queue";
import { fireScheduledJob } from "@ai-agent/scheduler";

export function startScheduledTriggerWorker(): Worker<ScheduledTriggerJobData> {
  const worker = new Worker<ScheduledTriggerJobData>(
    QUEUE_NAMES.scheduledTrigger,
    async (job) => {
      await fireScheduledJob(job.data.scheduledJobId);
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[scheduled-trigger] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
