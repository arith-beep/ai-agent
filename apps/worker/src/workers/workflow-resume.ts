import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, type WorkflowResumeJobData } from "@ai-agent/queue";
import { resumeWorkflowRun } from "@ai-agent/workflow-engine";

export function startWorkflowResumeWorker(): Worker<WorkflowResumeJobData> {
  const worker = new Worker<WorkflowResumeJobData>(
    QUEUE_NAMES.workflowResume,
    async (job) => {
      await resumeWorkflowRun(job.data.workflowRunId, job.data.resumePayload);
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[workflow-resume] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
