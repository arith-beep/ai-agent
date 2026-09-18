import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepo } from "@ai-agent/storage";
import { getQueues, isQueueAvailable } from "@ai-agent/queue";
import { ingestSalesKnowledgeSource } from "@ai-agent/sales-agent";
import { extractPdfBuffer } from "@ai-agent/rag";
import { getApiContext } from "@/lib/api-session";

// Text/PDF ingestion runs synchronously inline (chunk + embed), which can take a few
// seconds for a large document — give it more room than Vercel's default.
export const maxDuration = 60;

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const textOrUrlSchema = z.object({
  type: z.enum(["text", "url"]),
  name: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sources = await salesRepo.listKnowledgeSourcesForAgent(id);
  return NextResponse.json({ sources });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: agentId } = await params;
  const agent = await salesRepo.getAgentById(ctx.orgId, agentId);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
    if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "PDF exceeds the 15MB limit" }, { status: 400 });
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF uploads are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    try {
      text = await extractPdfBuffer(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: `Could not read this PDF: ${message}` }, { status: 400 });
    }
    if (!text.trim()) return NextResponse.json({ error: "No extractable text found in this PDF (it may be a scanned image)." }, { status: 400 });

    // No object storage configured for this MVP — the PDF is parsed at upload time and only its
    // extracted text is retained, so ingestion runs synchronously (no re-fetch needed later).
    const source = await salesRepo.createKnowledgeSource({
      orgId: ctx.orgId,
      agentId,
      createdBy: ctx.userId,
      name: file.name,
      type: "text",
      sourceUri: text,
    });
    if (!source) return NextResponse.json({ error: "Failed to create knowledge source" }, { status: 500 });
    await ingestSalesKnowledgeSource(ctx.orgId, source.id).catch(() => undefined);
    const refreshed = await salesRepo.getKnowledgeSource(source.id);
    return NextResponse.json({ source: refreshed }, { status: 201 });
  }

  const body = await request.json();
  const parsed = textOrUrlSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  if (parsed.data.type === "url") {
    try {
      new URL(parsed.data.content);
    } catch {
      return NextResponse.json({ error: "content must be a valid URL for type=url" }, { status: 400 });
    }
    if (!isQueueAvailable()) {
      return NextResponse.json(
        { error: "Website URL knowledge sources are not available in this deployment (no background queue is configured). Use Paste text or PDF upload instead." },
        { status: 501 },
      );
    }
  }

  const source = await salesRepo.createKnowledgeSource({
    orgId: ctx.orgId,
    agentId,
    createdBy: ctx.userId,
    name: parsed.data.name,
    type: parsed.data.type,
    sourceUri: parsed.data.content,
  });
  if (!source) return NextResponse.json({ error: "Failed to create knowledge source" }, { status: 500 });

  if (parsed.data.type === "text") {
    await ingestSalesKnowledgeSource(ctx.orgId, source.id).catch(() => undefined);
  } else {
    const queues = getQueues();
    await queues.ingestSalesKnowledgeSource.add("ingest", { sourceId: source.id });
  }

  const refreshed = await salesRepo.getKnowledgeSource(source.id);
  return NextResponse.json({ source: refreshed }, { status: 201 });
}
