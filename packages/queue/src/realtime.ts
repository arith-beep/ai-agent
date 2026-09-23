import { Redis } from "ioredis";
import type { ExecutionEvent } from "@ai-agent/shared-types";
import { getRedisConnection } from "./connection";

function channelForRun(runId: string): string {
  return `run-events:${runId}`;
}

/** Publishes a structured execution event for a run; the Playground/trace UI subscribes over SSE (see apps/web). */
export async function publishExecutionEvent(runId: string, event: ExecutionEvent): Promise<void> {
  const redis = getRedisConnection();
  await redis.publish(channelForRun(runId), JSON.stringify(event));
}

/**
 * Subscribes to a run's execution events on a dedicated ioredis connection
 * (required by ioredis: a connection in subscriber mode cannot issue other
 * commands). Returns an unsubscribe function that closes that connection.
 */
export function subscribeToRun(runId: string, onEvent: (event: ExecutionEvent) => void): () => void {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set — no queue/worker is configured for this deployment.");
  const subscriber = new Redis(url);
  const channel = channelForRun(runId);

  subscriber.subscribe(channel).catch((error: unknown) => {
    console.error(`Failed to subscribe to ${channel}:`, error);
  });

  subscriber.on("message", (receivedChannel, message) => {
    if (receivedChannel !== channel) return;
    try {
      onEvent(JSON.parse(message) as ExecutionEvent);
    } catch (error) {
      console.error("Failed to parse execution event:", error);
    }
  });

  return () => {
    subscriber.disconnect();
  };
}
