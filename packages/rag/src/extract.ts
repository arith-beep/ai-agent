import type { schema } from "@ai-agent/storage";

type KnowledgeSourceType = (typeof schema.knowledgeSourceTypeEnum.enumValues)[number];

const FETCH_TIMEOUT_MS = 30_000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

/** Extracts plain text from an already-in-memory PDF buffer (e.g. a direct file upload with no URL to fetch). */
export async function extractPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

/** Extracts plain text from a document source, ready for chunking. */
export async function extractText(sourceType: KnowledgeSourceType, sourceUri: string): Promise<string> {
  switch (sourceType) {
    case "txt":
    case "csv": {
      const buffer = await fetchBuffer(sourceUri);
      return buffer.toString("utf-8");
    }
    case "url":
    case "website": {
      const buffer = await fetchBuffer(sourceUri);
      return stripHtml(buffer.toString("utf-8"));
    }
    case "pdf": {
      const buffer = await fetchBuffer(sourceUri);
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text;
    }
    case "docx": {
      const buffer = await fetchBuffer(sourceUri);
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "database":
    case "api":
      throw new Error(
        `Knowledge source type "${sourceType}" requires a connector-specific ingestion path that isn't wired up yet. Use url/txt/pdf/docx/csv for now.`,
      );
    default: {
      const exhaustive: never = sourceType;
      throw new Error(`Unknown knowledge source type: ${exhaustive}`);
    }
  }
}
