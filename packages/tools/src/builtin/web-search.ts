import { z } from "zod";
import type { BuiltinToolImplementation, ToolContext } from "../types";

const inputSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().max(10).default(5),
});

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * Web search via the Tavily API (https://tavily.com). Requires the tool's
 * authConfig to carry an `apiKey` — set when the tool is configured in
 * Settings > Tools. We deliberately fail loudly rather than returning
 * fabricated results when no key is configured.
 */
export const webSearchTool: BuiltinToolImplementation<z.infer<typeof inputSchema>> = {
  key: "web_search",
  name: "Web Search",
  description: "Searches the web for a query and returns the top results with titles, URLs, and content snippets.",
  category: "search",
  inputSchema,
  inputJsonSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      maxResults: { type: "integer", minimum: 1, maximum: 10, default: 5 },
    },
    required: ["query"],
  },
  async execute(input, ctx: ToolContext) {
    const apiKey = ctx.authConfig?.apiKey;
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new Error(
        "Web Search is not configured for this organization. Add a Tavily API key to this tool under Settings > Tools before attaching it to an agent.",
      );
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query: input.query, max_results: input.maxResults }),
    });
    if (!response.ok) {
      throw new Error(`Web search failed: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as { results: TavilyResult[] };
    return {
      query: input.query,
      results: data.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content, score: r.score })),
    };
  },
};
