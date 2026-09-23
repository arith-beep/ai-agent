import { randomUUID } from "node:crypto";
import { tool, jsonSchema, type CoreTool } from "ai";
import { z } from "zod";
import { schema } from "@ai-agent/storage";
import { executeTool } from "@ai-agent/tools";
import { retrieveAgentKnowledge, type RetrievedChunk } from "./knowledge";

type ToolRow = typeof schema.tools.$inferSelect;

export interface ToolCallDebug {
  name: string;
  input: unknown;
  output?: unknown;
  status: "success" | "error";
  errorMessage?: string;
  durationMs: number;
}

export interface RunDebug {
  retrievedChunks: RetrievedChunk[];
  toolCalls: ToolCallDebug[];
}

export interface SalesToolSetContext {
  orgId: string;
  agentId: string;
  conversationId: string;
}

function wrapAttachedTool(dbTool: ToolRow, ctx: SalesToolSetContext, debug: RunDebug) {
  return tool({
    description: dbTool.description,
    parameters: jsonSchema(dbTool.inputSchema as Parameters<typeof jsonSchema>[0]),
    execute: async (input) => {
      const result = await executeTool({
        tool: dbTool,
        orgId: ctx.orgId,
        agentId: ctx.agentId,
        runId: ctx.conversationId,
        spanId: randomUUID(),
        conversationId: ctx.conversationId,
        input,
      });
      debug.toolCalls.push({
        name: dbTool.name,
        input,
        output: result.status === "success" ? result.output : undefined,
        status: result.status,
        errorMessage: result.errorMessage,
        durationMs: result.durationMs,
      });
      if (result.status === "error") return { error: result.errorMessage };
      return result.output;
    },
  });
}

function buildKnowledgeQueryTool(ctx: SalesToolSetContext, debug: RunDebug) {
  return tool({
    description:
      "Search this agent's knowledge base for information relevant to a query. Always use this before answering factual questions about the product, company, pricing, or policies — do not answer from memory.",
    parameters: z.object({ query: z.string().min(1).describe("What to search for") }),
    execute: async ({ query }) => {
      const results = await retrieveAgentKnowledge(ctx.orgId, ctx.agentId, query);
      debug.retrievedChunks.push(...results);
      return {
        results: results.map((r) => ({ chunkId: r.id, content: r.content, score: r.score })),
        found: results.length > 0,
      };
    },
  });
}

export function buildSalesToolSet(attachedTools: ToolRow[], ctx: SalesToolSetContext, debug: RunDebug): Record<string, CoreTool> {
  const toolSet: Record<string, CoreTool> = {
    query_knowledge_base: buildKnowledgeQueryTool(ctx, debug),
  };
  for (const dbTool of attachedTools) {
    const key = dbTool.builtinKey ?? dbTool.id;
    toolSet[key] = wrapAttachedTool(dbTool, ctx, debug);
  }
  return toolSet;
}
