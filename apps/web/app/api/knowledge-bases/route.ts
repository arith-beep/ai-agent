import { NextResponse } from "next/server";
import { z } from "zod";
import { knowledgeRepo, schema } from "@ai-agent/storage";
import { getApiContext } from "@/lib/api-session";

const createKbSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sourceType: z.enum(schema.knowledgeSourceTypeEnum.enumValues),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const knowledgeBases = await knowledgeRepo.listKnowledgeBases(ctx.orgId);
  return NextResponse.json({ knowledgeBases });
}

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createKbSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const kb = await knowledgeRepo.createKnowledgeBase({ orgId: ctx.orgId, createdBy: ctx.userId, ...parsed.data });
  return NextResponse.json({ knowledgeBase: kb }, { status: 201 });
}
