import { z } from "zod";
import type { BuiltinToolImplementation } from "../types";

const inputSchema = z.object({
  url: z.string().url(),
});

const MAX_CHARS = 200_000;
const TIMEOUT_MS = 15_000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const fileReaderTool: BuiltinToolImplementation<z.infer<typeof inputSchema>> = {
  key: "file_reader",
  name: "File Reader",
  description: "Fetches a text-based file or web page by URL and returns its plain-text content.",
  category: "file",
  inputSchema,
  inputJsonSchema: {
    type: "object",
    properties: { url: { type: "string", format: "uri" } },
    required: ["url"],
  },
  async execute(input) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(input.url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${input.url}: ${response.status} ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") ?? "";
      const raw = await response.text();
      const content = contentType.includes("html") ? stripHtml(raw) : raw;
      const truncated = content.length > MAX_CHARS;
      return {
        url: input.url,
        contentType,
        content: truncated ? content.slice(0, MAX_CHARS) : content,
        truncated,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
