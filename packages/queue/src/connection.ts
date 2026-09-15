import { Redis } from "ioredis";

let connection: Redis | undefined;

/** Shared ioredis connection for BullMQ queues/workers. BullMQ requires maxRetriesPerRequest: null. */
export function getRedisConnection(): Redis {
  if (!connection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    connection = new Redis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}
