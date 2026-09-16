import { Redis } from "ioredis";

// See packages/storage/src/db.ts for why this lives on `globalThis` rather
// than module scope: it's what keeps this connection alive across `next
// dev`'s per-recompile module re-evaluation instead of leaking a new one
// each time.
declare global {
  // eslint-disable-next-line no-var
  var __aiAgentRedisConnection: Redis | undefined;
}

/** Shared ioredis connection for BullMQ queues/workers. BullMQ requires maxRetriesPerRequest: null. */
export function getRedisConnection(): Redis {
  if (!globalThis.__aiAgentRedisConnection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    globalThis.__aiAgentRedisConnection = new Redis(url, { maxRetriesPerRequest: null });
  }
  return globalThis.__aiAgentRedisConnection;
}
