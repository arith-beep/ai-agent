import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { credentialsRepo } from "@ai-agent/storage";

const EMBEDDING_MODEL = "text-embedding-3-small";

async function getOpenAiKey(orgId: string): Promise<string> {
  const fromDb = await credentialsRepo.getDecryptedApiKey(orgId, "openai");
  if (fromDb) return fromDb;
  const fromEnv = process.env.OPENAI_API_KEY;
  if (fromEnv) return fromEnv;
  throw new Error(
    "An OpenAI API key is required for embeddings (knowledge bases and semantic memory both use it, regardless of which provider an agent's chat model uses). Configure one under Settings > Models.",
  );
}

/** Embeds a batch of texts with OpenAI text-embedding-3-small (1536 dimensions, matches the pgvector column width). */
export async function embedTexts(orgId: string, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const apiKey = await getOpenAiKey(orgId);
  const openai = createOpenAI({ apiKey });
  const { embeddings } = await embedMany({ model: openai.textEmbeddingModel(EMBEDDING_MODEL), values: texts });
  return embeddings;
}

export async function embedText(orgId: string, text: string): Promise<number[]> {
  const [embedding] = await embedTexts(orgId, [text]);
  if (!embedding) throw new Error("Embedding call returned no result.");
  return embedding;
}
