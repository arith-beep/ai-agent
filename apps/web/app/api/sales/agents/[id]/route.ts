import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepo } from "@ai-agent/storage";
import { salesIdentitySchema, salesPlaybookSchema, salesGuardrailsSchema } from "@ai-agent/shared-types";
import { buildSalesSystemPrompt } from "@ai-agent/sales-agent";
import { getApiContext } from "@/lib/api-session";

const updateAgentSchema = z
  .object({
    identity: salesIdentitySchema.partial(),
    playbook: salesPlaybookSchema.partial(),
    guardrails: salesGuardrailsSchema.partial(),
    modelProvider: z.enum(["openai", "anthropic", "google"]),
    modelName: z.string().min(1),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().positive().max(200_000),
    status: z.enum(["draft", "active", "paused", "archived"]),
  })
  .partial();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const agent = await salesRepo.getAgentById(ctx.orgId, id);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ agent, generatedSystemPrompt: buildSalesSystemPrompt(agent) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await salesRepo.getAgentById(ctx.orgId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const { identity, playbook, guardrails, ...rest } = parsed.data;
  const agent = await salesRepo.updateAgent(ctx.orgId, id, {
    ...rest,
    ...identity,
    playbook: playbook ? salesPlaybookSchema.parse({ ...(existing.playbook as object), ...playbook }) : undefined,
    guardrails: guardrails ? salesGuardrailsSchema.parse({ ...(existing.guardrails as object), ...guardrails }) : undefined,
  });

  return NextResponse.json({ agent, generatedSystemPrompt: agent ? buildSalesSystemPrompt(agent) : null });
}
