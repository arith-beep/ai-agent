import { z } from "zod";
import type { BuiltinToolImplementation } from "../types";

const inputSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});

const MAX_RESPONSE_BYTES = 1_000_000;
const TIMEOUT_MS = 15_000;

export const httpRequestTool: BuiltinToolImplementation<z.infer<typeof inputSchema>> = {
  key: "http_request",
  name: "HTTP Request",
  description: "Makes an HTTP request to an external URL and returns the response status, headers, and body.",
  category: "http",
  inputSchema,
  inputJsonSchema: {
    type: "object",
    properties: {
      url: { type: "string", format: "uri" },
      method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], default: "GET" },
      headers: { type: "object", additionalProperties: { type: "string" } },
      body: {},
    },
    required: ["url"],
  },
  async execute(input) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      const truncated = text.length > MAX_RESPONSE_BYTES;
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: truncated ? text.slice(0, MAX_RESPONSE_BYTES) : text,
        truncated,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
