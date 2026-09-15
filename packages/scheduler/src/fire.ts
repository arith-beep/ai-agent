import { schedulingRepo, runsRepo, workflowsRepo } from "@ai-agent/storage";
import { getQueues } from "@ai-agent/queue";
import { startWorkflowRun } from "@ai-agent/workflow-engine";
import type { WorkflowDefinition } from "@ai-agent/shared-types";
import { nextRunFor } from "./schedule";

/** Called by the worker's `scheduled-trigger` job processor when a BullMQ repeatable/delayed job fires. */
export async function fireScheduledJob(scheduledJobId: string): Promise<void> {
  const job = await schedulingRepo.getScheduledJob(scheduledJobId);
  if (!job) return;
  if (job.status !== "active") return;

  const firedAt = new Date();

  if (job.targetType === "agent") {
    const run = await runsRepo.createAgentRun({ agentId: job.targetId, input: { sourceKind: "schedule", scheduledJobId } });
    const queues = getQueues();
    await queues.agentRun.add("run", {
      runId: run.id,
      orgId: job.orgId,
      agentId: job.targetId,
      input: { sourceKind: "schedule", scheduledJobId },
    });
  } else {
    const workflow = await workflowsRepo.getWorkflow(job.targetId);
    if (!workflow) throw new Error(`Scheduled workflow ${job.targetId} not found`);
    await startWorkflowRun({
      orgId: job.orgId,
      workflowId: workflow.id,
      definition: workflow.definition as unknown as WorkflowDefinition,
      input: { sourceKind: "schedule", scheduledJobId },
      triggeredByType: "schedule",
      triggeredById: scheduledJobId,
    });
  }

  const nextRunAt = job.cronExpression ? nextRunFor(job.cronExpression) : undefined;
  await schedulingRepo.recordScheduledJobFired(scheduledJobId, firedAt, nextRunAt);
}
