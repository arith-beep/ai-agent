import { salesRepo } from "@ai-agent/storage";
import { embedText, embedTexts } from "@ai-agent/model-providers";
import { chunkText, extractText } from "@ai-agent/rag";

/**
 * Ingests one sales knowledge source: pasted text is chunked directly; url/pdf
 * are extracted first. Reuses the same chunker/extractor/embedder as the
 * internal platform's knowledge base (packages/rag, packages/model-providers)
 * against this domain's own tables — see packages/storage/src/schema/sales.ts
 * for why the tables aren't shared.
 */
export async function ingestSalesKnowledgeSource(orgId: string, sourceId: string): Promise<void> {
  const source = await salesRepo.getKnowledgeSource(sourceId);
  if (!source) throw new Error(`Knowledge source ${sourceId} not found.`);

  try {
    await salesRepo.updateSourceStatus(sourceId, "processing");

    const text = source.type === "text" ? source.sourceUri : await extractText(source.type, source.sourceUri);
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await salesRepo.updateSourceStatus(sourceId, "failed", "No text content could be extracted from this source.");
      return;
    }

    const embeddings = await embedTexts(orgId, chunks);
    await salesRepo.insertKnowledgeChunks(
      sourceId,
      chunks.map((content, i) => ({ content, embedding: embeddings[i] ?? [], chunkIndex: i })),
    );
    await salesRepo.updateSourceStatus(sourceId, "ready");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await salesRepo.updateSourceStatus(sourceId, "failed", message);
    throw error;
  }
}

export interface RetrievedChunk {
  id: string;
  content: string;
  sourceId: string;
  score: number;
}

export async function retrieveAgentKnowledge(orgId: string, agentId: string, query: string, topK = 5): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(orgId, query);
  return salesRepo.searchAgentKnowledge(agentId, queryEmbedding, topK);
}
