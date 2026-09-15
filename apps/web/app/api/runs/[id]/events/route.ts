import { subscribeToRun } from "@ai-agent/queue";
import { runsRepo } from "@ai-agent/storage";
import type { ExecutionEvent } from "@ai-agent/shared-types";
import { getApiContext } from "@/lib/api-session";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  const { id: runId } = await params;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        unsubscribe?.();
        controller.close();
      };

      send(JSON.stringify({ type: "connected", runId }));

      // Subscribe BEFORE checking persisted state, so an event published
      // between the check and the subscribe call is never missed.
      unsubscribe = subscribeToRun(runId, (event) => {
        send(JSON.stringify(event));
        if (event.type === "run-completed" || event.type === "run-failed") finish();
      });

      // A run that finished (or fails near-instantly, e.g. no model
      // credentials configured) before this connection was established
      // would otherwise have its terminal pub/sub event silently dropped —
      // reconcile against the persisted row so the client always learns
      // the outcome.
      const run = await runsRepo.getAgentRun(runId);
      if (run && (run.status === "completed" || run.status === "failed")) {
        const durationMs = run.completedAt ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime() : 0;
        const event: ExecutionEvent =
          run.status === "completed"
            ? {
                type: "run-completed",
                runId,
                output: run.output,
                tokenUsage: run.tokenUsage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                estimatedCost: Number(run.estimatedCost ?? 0),
                durationMs,
              }
            : { type: "run-failed", runId, errorMessage: run.errorMessage ?? "Run failed." };
        send(JSON.stringify(event));
        finish();
      }
    },
    cancel() {
      closed = true;
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
