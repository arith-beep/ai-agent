import { z } from "zod";
import { tool } from "ai";
import { retrieveRelevantChunks } from "./retrieval";

/**
 * RAG-as-a-tool (see docs/architecture/01-mastra-analysis.md §6): rather than
 * a bespoke retrieval subsystem, knowledge lookup is just another tool the
 * model can call, auto-attached by the Agent Runtime whenever an agent has
 * knowledge bases configured.
 */
export function createKnowledgeQueryTool(orgId: string, knowledgeBaseIds: string[]) {
  return tool({
    description:
      "Search the agent's attached knowledge base(s) for information relevant to a query. Returns the most relevant passages with similarity scores.",
    parameters: z.object({ query: z.string().min(1).describe("What to search for in the knowledge base") }),
    execute: async ({ query }) => {
      const results = await retrieveRelevantChunks(orgId, knowledgeBaseIds, query);
      return {
        results: results.map((r) => ({
          chunkId: r.id,
          documentId: r.documentId,
          content: r.content,
          score: r.score,
        })),
      };
    },
  });
}
