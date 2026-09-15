import { Queue, type JobsOptions } from "bullmq";
import { getRedisConnection } from "./connection";

export const QUEUE_NAMES = {
  agentRun: "agent-run",
  workflowStep: "workflow-step",
  workflowResume: "workflow-resume",
  deliverAgentMessage: "deliver-agent-message",
  scheduledTrigger: "scheduled-trigger",
  embedMemory: "embed-memory",
  ingestKnowledgeDocument: "ingest-knowledge-document",
} as const;

export interface AgentRunJobData {
  runId: string;
  orgId: string;
  agentId: string;
  input: unknown;
  threadId?: string;
}

export interface WorkflowResumeJobData {
  workflowRunId: string;
  resumePayload: unknown;
}

export interface DeliverAgentMessageJobData {
  messageId: string;
}

export interface ScheduledTriggerJobData {
  scheduledJobId: string;
}

export interface EmbedMemoryJobData {
  threadId: string;
  messageId: string;
}

export interface IngestKnowledgeDocumentJobData {
  documentId: string;
}

const priorityByMessagePriority: Record<string, number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

export function priorityFor(priority: "low" | "normal" | "high" | "urgent"): number {
  return priorityByMessagePriority[priority] ?? 3;
}

const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { age: 60 * 60 * 24 },
  removeOnFail: { age: 60 * 60 * 24 * 7 },
};

let queues: {
  agentRun: Queue<AgentRunJobData>;
  workflowResume: Queue<WorkflowResumeJobData>;
  deliverAgentMessage: Queue<DeliverAgentMessageJobData>;
  scheduledTrigger: Queue<ScheduledTriggerJobData>;
  embedMemory: Queue<EmbedMemoryJobData>;
  ingestKnowledgeDocument: Queue<IngestKnowledgeDocumentJobData>;
} | undefined;

/** Lazily-created singleton queue handles, shared across a process (web app enqueues, worker consumes). */
export function getQueues() {
  if (!queues) {
    const connection = getRedisConnection();
    queues = {
      agentRun: new Queue(QUEUE_NAMES.agentRun, { connection, defaultJobOptions }),
      workflowResume: new Queue(QUEUE_NAMES.workflowResume, { connection, defaultJobOptions }),
      deliverAgentMessage: new Queue(QUEUE_NAMES.deliverAgentMessage, { connection, defaultJobOptions }),
      scheduledTrigger: new Queue(QUEUE_NAMES.scheduledTrigger, { connection, defaultJobOptions: { attempts: 1 } }),
      embedMemory: new Queue(QUEUE_NAMES.embedMemory, { connection, defaultJobOptions }),
      ingestKnowledgeDocument: new Queue(QUEUE_NAMES.ingestKnowledgeDocument, { connection, defaultJobOptions }),
    };
  }
  return queues;
}
