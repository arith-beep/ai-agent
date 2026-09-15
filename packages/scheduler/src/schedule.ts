import parser from "cron-parser";
import { schedulingRepo } from "@ai-agent/storage";
import { getQueues, QUEUE_NAMES } from "@ai-agent/queue";

export interface CreateScheduledJobInput {
  orgId: string;
  targetType: "agent" | "workflow";
  targetId: string;
  cronExpression?: string;
  runOnceAt?: Date;
  createdBy: string;
}

function nextRunFor(cronExpression: string): Date {
  const interval = parser.parseExpression(cronExpression, { utc: true });
  return interval.next().toDate();
}

export async function createScheduledJob(input: CreateScheduledJobInput) {
  if (!input.cronExpression && !input.runOnceAt) {
    throw new Error("A scheduled job needs either a cronExpression or a runOnceAt time.");
  }
  const nextRunAt = input.cronExpression ? nextRunFor(input.cronExpression) : input.runOnceAt;

  const job = await schedulingRepo.createScheduledJob({ ...input, nextRunAt });

  const queues = getQueues();
  if (input.cronExpression) {
    await queues.scheduledTrigger.add(
      QUEUE_NAMES.scheduledTrigger,
      { scheduledJobId: job.id },
      { repeat: { pattern: input.cronExpression, utc: true }, jobId: job.id },
    );
  } else if (input.runOnceAt) {
    await queues.scheduledTrigger.add(
      QUEUE_NAMES.scheduledTrigger,
      { scheduledJobId: job.id },
      { delay: Math.max(0, input.runOnceAt.getTime() - Date.now()), jobId: job.id },
    );
  }

  return job;
}

export async function deleteScheduledJob(id: string) {
  const job = await schedulingRepo.getScheduledJob(id);
  if (!job) return;
  const queues = getQueues();
  if (job.cronExpression) {
    const repeatables = await queues.scheduledTrigger.getRepeatableJobs();
    const match = repeatables.find((r) => r.id === id);
    if (match) await queues.scheduledTrigger.removeRepeatableByKey(match.key);
  }
  await schedulingRepo.deleteScheduledJob(id);
}

export async function pauseScheduledJob(id: string) {
  await schedulingRepo.setScheduledJobStatus(id, "paused");
}

export async function resumeScheduledJob(id: string) {
  await schedulingRepo.setScheduledJobStatus(id, "active");
}

export async function listScheduledJobs(orgId: string) {
  return schedulingRepo.listScheduledJobs(orgId);
}

export { nextRunFor };
