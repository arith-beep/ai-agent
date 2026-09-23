import { Queue, type JobsOptions } from "bullmq";
import { getRedisConnection } from "./connection";

export const QUEUE_NAMES = {
  agentRun: "agent-run",
  workflowRun: "workflow-run",
  workflowResume: "workflow-resume",
  deliverAgentMessage: "deliver-agent-message",
  scheduledTrigger: "scheduled-trigger",
  embedMemory: "embed-memory",
  ingestKnowledgeDocument: "ingest-knowledge-document",
  ingestSalesKnowledgeSource: "ingest-sales-knowledge-source",
} as const;

export interface AgentRunJobData {
  runId: string;
  orgId: string;
  agentId: string;
  input: unknown;
  threadId?: string;
}

export interface WorkflowRunJobData {
  runId: string;
  orgId: string;
  workflowId: string;
  input: unknown;
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

export interface IngestSalesKnowledgeSourceJobData {
  sourceId: string;
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

interface QueueHandles {
  agentRun: Queue<AgentRunJobData>;
  workflowRun: Queue<WorkflowRunJobData>;
  workflowResume: Queue<WorkflowResumeJobData>;
  deliverAgentMessage: Queue<DeliverAgentMessageJobData>;
  scheduledTrigger: Queue<ScheduledTriggerJobData>;
  embedMemory: Queue<EmbedMemoryJobData>;
  ingestKnowledgeDocument: Queue<IngestKnowledgeDocumentJobData>;
  ingestSalesKnowledgeSource: Queue<IngestSalesKnowledgeSourceJobData>;
}

// See packages/storage/src/db.ts: each BullMQ Queue duplicates the Redis
// connection internally, so keeping this on `globalThis` (rather than
// module scope, which `next dev` re-evaluates on every recompile) is what
// stops those duplicated connections from leaking one set per edit.
declare global {
  // eslint-disable-next-line no-var
  var __aiAgentQueues: QueueHandles | undefined;
}

/** Lazily-created singleton queue handles, shared across a process (web app enqueues, worker consumes). */
export function getQueues(): QueueHandles {
  if (!globalThis.__aiAgentQueues) {
    const connection = getRedisConnection();
    globalThis.__aiAgentQueues = {
      agentRun: new Queue(QUEUE_NAMES.agentRun, { connection, defaultJobOptions }),
      workflowRun: new Queue(QUEUE_NAMES.workflowRun, { connection, defaultJobOptions }),
      workflowResume: new Queue(QUEUE_NAMES.workflowResume, { connection, defaultJobOptions }),
      deliverAgentMessage: new Queue(QUEUE_NAMES.deliverAgentMessage, { connection, defaultJobOptions }),
      scheduledTrigger: new Queue(QUEUE_NAMES.scheduledTrigger, { connection, defaultJobOptions: { attempts: 1 } }),
      embedMemory: new Queue(QUEUE_NAMES.embedMemory, { connection, defaultJobOptions }),
      ingestKnowledgeDocument: new Queue(QUEUE_NAMES.ingestKnowledgeDocument, { connection, defaultJobOptions }),
      ingestSalesKnowledgeSource: new Queue(QUEUE_NAMES.ingestSalesKnowledgeSource, { connection, defaultJobOptions }),
    };
  }
  return globalThis.__aiAgentQueues;
}
