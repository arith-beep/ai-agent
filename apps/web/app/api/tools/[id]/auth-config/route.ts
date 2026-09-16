import { NextResponse } from "next/server";
import { z } from "zod";
import { toolsRepo } from "@ai-agent/storage";
import { encryptSecret } from "@ai-agent/crypto";
import { getApiContext } from "@/lib/api-session";

const schema = z.object({ authConfig: z.record(z.string(), z.unknown()) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const tool = await toolsRepo.getToolById(ctx.orgId, id);
  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const encrypted = encryptSecret(JSON.stringify(parsed.data.authConfig));
  await toolsRepo.setToolAuthConfig(ctx.orgId, id, encrypted);
  return NextResponse.json({ ok: true });
}
