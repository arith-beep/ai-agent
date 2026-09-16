import { z } from "zod";

export const toolCategorySchema = z.enum([
  "http",
  "file",
  "search",
  "database",
  "communication",
  "knowledge",
  "agent",
  "custom",
]);
export type ToolCategory = z.infer<typeof toolCategorySchema>;

/**
 * A tool's schema is stored as JSON Schema so it can be persisted/edited
 * generically; individual tool implementations still validate with Zod
 * at execution time (see packages/tools).
 */
export const toolDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  category: toolCategorySchema,
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
  requiresApproval: z.boolean().default(false),
});
export type ToolDefinition = z.infer<typeof toolDefinitionSchema>;

/**
 * How an org-defined custom tool (no builtinKey) is actually executed: a
 * templated HTTP call. `url`/`headers`/`body` may contain `{{input.field}}`
 * (validated call arguments) or `{{auth.field}}` (this tool's own decrypted
 * authConfig) placeholders — see @ai-agent/tools's custom-http executor.
 * `kind` is a discriminant so a future non-HTTP execution mode can be added
 * without breaking existing custom tools.
 */
export const customToolExecutionConfigSchema = z.object({
  kind: z.literal("http"),
  url: z.string().min(1).max(2000),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
});
export type CustomToolExecutionConfig = z.infer<typeof customToolExecutionConfigSchema>;

/** A single field in a custom tool's user-authored parameter list — the UI builds inputSchema (JSON Schema) from these rather than asking for raw JSON Schema. */
export const customToolParamSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["string", "number", "boolean"]),
  description: z.string().max(500).optional(),
  required: z.boolean().default(true),
});
export type CustomToolParam = z.infer<typeof customToolParamSchema>;

export const createCustomToolInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  category: toolCategorySchema.default("custom"),
  requiresApproval: z.boolean().default(false),
  params: z.array(customToolParamSchema).default([]),
  executionConfig: customToolExecutionConfigSchema,
});
export type CreateCustomToolInput = z.infer<typeof createCustomToolInputSchema>;

export function paramsToJsonSchema(params: CustomToolParam[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const param of params) {
    properties[param.name] = { type: param.type, ...(param.description ? { description: param.description } : {}) };
    if (param.required) required.push(param.name);
  }
  return { type: "object", properties, ...(required.length > 0 ? { required } : {}) };
}

export const toolExecutionStatusSchema = z.enum(["success", "error"]);

export const toolExecutionResultSchema = z.object({
  status: toolExecutionStatusSchema,
  output: z.unknown().optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().nonnegative(),
});
export type ToolExecutionResult = z.infer<typeof toolExecutionResultSchema>;
