import { toolsRepo } from "@ai-agent/storage";
import { BUILTIN_TOOLS } from "./registry";
import type { BuiltinToolImplementation } from "./types";

async function seedImplementations(orgId: string, createdBy: string, implementations: BuiltinToolImplementation[]) {
  const existing = await toolsRepo.listTools(orgId);
  const existingKeys = new Set(existing.map((t) => t.builtinKey).filter((k): k is string => Boolean(k)));

  const created = [];
  for (const impl of implementations) {
    if (existingKeys.has(impl.key)) continue;
    const tool = await toolsRepo.createTool(orgId, createdBy, {
      name: impl.name,
      description: impl.description,
      category: impl.category,
      inputSchema: impl.inputJsonSchema,
      requiresApproval: false,
      builtinKey: impl.key,
    });
    created.push(tool);
  }
  return created;
}

/**
 * Creates a `tools` row for each builtin implementation the org doesn't
 * already have (matched by builtinKey), so calling this again after new
 * builtins are added only creates the new ones instead of duplicating.
 */
export async function seedBuiltinTools(orgId: string, createdBy: string) {
  return seedImplementations(orgId, createdBy, Object.values(BUILTIN_TOOLS));
}

const SALES_BUILTIN_KEYS = ["sales_lead_upsert", "sales_meeting_book", "sales_human_handoff"] as const;

/** Seeds just the Sales Agent Builder's built-in tools (lead capture, meeting request, human handoff) for an org. */
export async function seedSalesTools(orgId: string, createdBy: string) {
  const implementations = SALES_BUILTIN_KEYS.map((key) => BUILTIN_TOOLS[key]).filter((i): i is BuiltinToolImplementation => Boolean(i));
  return seedImplementations(orgId, createdBy, implementations);
}
