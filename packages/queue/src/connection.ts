import { Redis } from "ioredis";

// See packages/storage/src/db.ts for why this lives on `globalThis` rather
// than module scope: it's what keeps this connection alive across `next
// dev`'s per-recompile module re-evaluation instead of leaking a new one
// each time.
declare global {
  // eslint-disable-next-line no-var
  var __aiAgentRedisConnection: Redis | undefined;
}

/** True when a Redis-backed queue is configured for this deployment (BullMQ jobs, e.g. URL knowledge ingestion). */
export function isQueueAvailable(): boolean {
  return Boolean(process.env.REDIS_URL);
}

/**
 * Shared ioredis connection for BullMQ queues/workers. BullMQ requires maxRetriesPerRequest: null.
 * Throws immediately when REDIS_URL is unset rather than defaulting to localhost — on a deployment
 * with no Redis (e.g. the first Vercel demo), that default would hang retrying a connection that
 * will never exist instead of failing fast. Callers that can run without a queue (URL knowledge
 * ingestion) should check isQueueAvailable() first and fail honestly rather than call this.
 */
export function getRedisConnection(): Redis {
  if (!globalThis.__aiAgentRedisConnection) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set — no queue/worker is configured for this deployment.");
    globalThis.__aiAgentRedisConnection = new Redis(url, { maxRetriesPerRequest: null });
  }
  return globalThis.__aiAgentRedisConnection;
}
