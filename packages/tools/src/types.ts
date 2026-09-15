import type { ZodType } from "zod";

export interface ToolContext {
  orgId: string;
  agentId?: string;
  authConfig?: Record<string, unknown>;
}

export interface BuiltinToolImplementation<TInput = unknown, TOutput = unknown> {
  key: string;
  name: string;
  description: string;
  category: "http" | "file" | "search" | "database" | "communication" | "knowledge" | "agent" | "custom";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: ZodType<TInput, any, any>;
  inputJsonSchema: Record<string, unknown>;
  execute: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}
