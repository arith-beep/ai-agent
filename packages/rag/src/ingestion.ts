import { knowledgeRepo } from "@ai-agent/storage";
import { embedTexts } from "@ai-agent/model-providers";
import { chunkText } from "./chunker";
import { extractText } from "./extract";

export async function ingestDocument(orgId: string, documentId: string): Promise<void> {
  const doc = await knowledgeRepo.getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);
  const kb = await knowledgeRepo.getKnowledgeBaseById(doc.knowledgeBaseId);
  if (!kb) throw new Error(`Knowledge base ${doc.knowledgeBaseId} not found`);

  try {
    await knowledgeRepo.updateDocumentStatus(documentId, "parsing");
    const text = await extractText(kb.sourceType, doc.sourceUri);

    await knowledgeRepo.updateDocumentStatus(documentId, "chunking");
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await knowledgeRepo.updateDocumentStatus(documentId, "failed", "No text content could be extracted from this document.");
      return;
    }

    await knowledgeRepo.updateDocumentStatus(documentId, "embedding");
    const embeddings = await embedTexts(orgId, chunks);

    await knowledgeRepo.insertChunks(
      documentId,
      chunks.map((content, i) => ({ content, embedding: embeddings[i] ?? [], chunkIndex: i })),
    );
    await knowledgeRepo.updateDocumentStatus(documentId, "ready");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await knowledgeRepo.updateDocumentStatus(documentId, "failed", message);
    throw error;
  }
}
