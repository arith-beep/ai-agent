import { toolsRepo } from "@ai-agent/storage";
import { BUILTIN_TOOLS } from "./registry";

/**
 * Creates a `tools` row for each builtin implementation the org doesn't
 * already have (matched by builtinKey), so calling this again after new
 * builtins are added only creates the new ones instead of duplicating.
 */
export async function seedBuiltinTools(orgId: string, createdBy: string) {
  const existing = await toolsRepo.listTools(orgId);
  const existingKeys = new Set(existing.map((t) => t.builtinKey).filter((k): k is string => Boolean(k)));

  const created = [];
  for (const impl of Object.values(BUILTIN_TOOLS)) {
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
