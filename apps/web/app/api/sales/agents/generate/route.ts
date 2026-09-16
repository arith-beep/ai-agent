import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { salesAgentConfigSchema } from "@ai-agent/shared-types";
import { resolveModel } from "@ai-agent/model-providers";
import { getApiContext } from "@/lib/api-session";

const generateInputSchema = z.object({ prompt: z.string().min(10).max(2000) });

const configShapeSchema = salesAgentConfigSchema.omit({ modelProvider: true, modelName: true, temperature: true, maxTokens: true });

function heuristicFallback(prompt: string) {
  return configShapeSchema.parse({
    identity: {
      name: "Sales Assistant",
      companyName: "Your Company",
      role: "Sales Development Representative",
      description: prompt.slice(0, 500),
      language: "en",
      tone: "professional",
      personality: [],
    },
    playbook: {
      primaryObjective: prompt.slice(0, 500),
      qualificationCriteria: [
        { name: "Need", description: "Does the visitor have a real problem this product solves?" },
        { name: "Budget", description: "Can they realistically afford this?" },
        { name: "Timeline", description: "When are they looking to decide?" },
      ],
      discoveryQuestions: ["What's driving you to look into this right now?", "What have you tried so far?"],
    },
    guardrails: {
      disallowedTopics: ["pricing guarantees", "competitor disparagement"],
      escalationTriggers: ["the lead asks for a refund or contract change", "the lead becomes frustrated or hostile"],
      maxAutonomy: "act_with_confirmation",
    },
  });
}

/** Best-effort AI-assisted config generation. Falls back to a reasonable rule-based default (and says so) if no model credential is configured — never fakes a successful generation. */
export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = generateInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  try {
    const model = await resolveModel(ctx.orgId, { provider: "openai", model: "gpt-4o-mini" });
    const { object } = await generateObject({
      model,
      schema: configShapeSchema,
      system:
        "You design B2B sales agent configurations. Given a description of what the agent should do, produce a complete, specific configuration — invent no false claims about a real company, and prefer 3-6 concrete qualification criteria and discovery questions grounded in the description.",
      prompt: parsed.data.prompt,
    });
    return NextResponse.json({ config: object, aiGenerated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      config: heuristicFallback(parsed.data.prompt),
      aiGenerated: false,
      note: `AI generation unavailable (${message}). Filled in a starting template from your description — configure a model provider under Settings to enable AI generation, then edit freely below.`,
    });
  }
}
