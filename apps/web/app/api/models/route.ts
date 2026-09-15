import { NextResponse } from "next/server";
import { z } from "zod";
import { credentialsRepo } from "@ai-agent/storage";
import { modelProviderSchema } from "@ai-agent/shared-types";
import { getApiContext } from "@/lib/api-session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const providers = await credentialsRepo.listConfiguredProviders(ctx.orgId);
  return NextResponse.json({ providers });
}

const credentialSchema = z.object({ provider: modelProviderSchema, apiKey: z.string().min(1) });

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = credentialSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await credentialsRepo.upsertModelCredential(ctx.orgId, ctx.userId, parsed.data.provider, parsed.data.apiKey);
  return NextResponse.json({ ok: true });
}
