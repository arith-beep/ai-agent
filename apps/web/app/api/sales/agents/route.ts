import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepo } from "@ai-agent/storage";
import { salesPlaybookSchema, salesGuardrailsSchema } from "@ai-agent/shared-types";
import { seedSalesTools } from "@ai-agent/tools";
import { getApiContext } from "@/lib/api-session";

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  companyName: z.string().min(1).max(150),
  role: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  language: z.string().min(2).max(10).default("en"),
  tone: z.string().min(1).max(40).default("professional"),
  personality: z.array(z.string()).default([]),
  playbook: salesPlaybookSchema.partial().default({}),
  guardrails: salesGuardrailsSchema.partial().default({}),
  modelProvider: z.enum(["openai", "anthropic", "google"]).default("openai"),
  modelName: z.string().min(1).default("gpt-4o-mini"),
  temperature: z.number().min(0).max(2).default(0.5),
  maxTokens: z.number().int().positive().max(200_000).default(2048),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agents = await salesRepo.listAgents(ctx.orgId);
  return NextResponse.json({ agents });
}

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const { playbook, guardrails, ...rest } = parsed.data;
  const agent = await salesRepo.createAgent(ctx.orgId, ctx.userId, {
    ...rest,
    playbook: salesPlaybookSchema.parse({ primaryObjective: "Help visitors and move qualified ones toward a next step.", ...playbook }),
    guardrails: salesGuardrailsSchema.parse(guardrails ?? {}),
  });

  // Every sales agent needs the lead/meeting/handoff tools available to attach — seed once per org.
  await seedSalesTools(ctx.orgId, ctx.userId);

  return NextResponse.json({ agent }, { status: 201 });
}
