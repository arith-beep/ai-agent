import { knowledgeRepo } from "@ai-agent/storage";
import { embedText } from "@ai-agent/model-providers";

export async function retrieveRelevantChunks(orgId: string, knowledgeBaseIds: string[], query: string, topK = 5) {
  if (knowledgeBaseIds.length === 0) return [];
  const queryEmbedding = await embedText(orgId, query);
  return knowledgeRepo.searchChunks(knowledgeBaseIds, queryEmbedding, topK);
}
