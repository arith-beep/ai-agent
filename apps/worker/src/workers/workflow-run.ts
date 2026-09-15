import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, type WorkflowRunJobData } from "@ai-agent/queue";
import { workflowsRepo } from "@ai-agent/storage";
import { executeWorkflowRun } from "@ai-agent/workflow-engine";
import type { WorkflowDefinition } from "@ai-agent/shared-types";

export function startWorkflowRunWorker(): Worker<WorkflowRunJobData> {
  const worker = new Worker<WorkflowRunJobData>(
    QUEUE_NAMES.workflowRun,
    async (job) => {
      const workflow = await workflowsRepo.getWorkflow(job.data.workflowId);
      if (!workflow) throw new Error(`Workflow ${job.data.workflowId} not found`);
      await executeWorkflowRun(job.data.runId, {
        orgId: job.data.orgId,
        definition: workflow.definition as unknown as WorkflowDefinition,
        input: job.data.input,
      });
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[workflow-run] job ${job?.id} failed:`, err.message);
  });
  return worker;
}
