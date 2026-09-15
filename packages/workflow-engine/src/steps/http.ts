import type { NodeHandler } from "../types";

const TIMEOUT_MS = 20_000;

export const httpRequestStepHandler: NodeHandler = async (node) => {
  if (node.type !== "http_request") throw new Error("httpRequestStepHandler received a non-http_request node");
  const config = node.config as { url: string; method?: string; headers?: Record<string, string>; body?: unknown };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(config.url, {
      method: config.method ?? "GET",
      headers: config.headers,
      body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      signal: controller.signal,
    });
    const body = await response.text();
    return { type: "ok", output: { status: response.status, body } };
  } finally {
    clearTimeout(timeout);
  }
};

/** An outbound webhook call — functionally an HTTP POST of the current step input to a target URL. */
export const webhookStepHandler: NodeHandler = async (node, input) => {
  if (node.type !== "webhook") throw new Error("webhookStepHandler received a non-webhook node");
  const config = node.config as { path: string };
  const response = await fetch(config.path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return { type: "ok", output: { status: response.status } };
};
