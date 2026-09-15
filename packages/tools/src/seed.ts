import { toolsRepo } from "@ai-agent/storage";
import { BUILTIN_TOOLS } from "./registry";

/** Creates a `tools` row for each builtin implementation so an org can attach them to agents. */
export async function seedBuiltinTools(orgId: string, createdBy: string) {
  const created = [];
  for (const impl of Object.values(BUILTIN_TOOLS)) {
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
