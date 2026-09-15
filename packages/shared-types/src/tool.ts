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

export const toolExecutionStatusSchema = z.enum(["success", "error"]);

export const toolExecutionResultSchema = z.object({
  status: toolExecutionStatusSchema,
  output: z.unknown().optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().nonnegative(),
});
export type ToolExecutionResult = z.infer<typeof toolExecutionResultSchema>;
