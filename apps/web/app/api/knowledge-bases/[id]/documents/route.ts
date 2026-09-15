import { NextResponse } from "next/server";
import { z } from "zod";
import { knowledgeRepo } from "@ai-agent/storage";
import { getQueues } from "@ai-agent/queue";
import { getApiContext } from "@/lib/api-session";

const addDocSchema = z.object({ sourceUri: z.string().url() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const documents = await knowledgeRepo.listDocuments(id);
  return NextResponse.json({ documents });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: knowledgeBaseId } = await params;

  const body = await request.json();
  const parsed = addDocSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const kb = await knowledgeRepo.getKnowledgeBaseById(knowledgeBaseId);
  if (!kb || kb.orgId !== ctx.orgId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const document = await knowledgeRepo.createDocument(knowledgeBaseId, parsed.data.sourceUri);

  const queues = getQueues();
  await queues.ingestKnowledgeDocument.add("ingest", { documentId: document.id });

  return NextResponse.json({ document }, { status: 201 });
}
