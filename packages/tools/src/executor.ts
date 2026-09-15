import { decryptSecret } from "@ai-agent/crypto";
import { toolsRepo, schema } from "@ai-agent/storage";
import type { ToolExecutionResult } from "@ai-agent/shared-types";
import { getBuiltinTool } from "./registry";

type ToolRow = typeof schema.tools.$inferSelect;

export interface ExecuteToolParams {
  tool: ToolRow;
  orgId: string;
  agentId?: string;
  runId?: string;
  spanId?: string;
  input: unknown;
}

export async function executeTool(params: ExecuteToolParams): Promise<ToolExecutionResult> {
  const startedAt = Date.now();
  const { tool } = params;

  try {
    if (!tool.builtinKey) {
      throw new Error(`Tool "${tool.name}" has no runtime implementation (builtinKey is not set).`);
    }
    const impl = getBuiltinTool(tool.builtinKey);
    if (!impl) {
      throw new Error(`No implementation registered for builtin tool key "${tool.builtinKey}".`);
    }

    const parsedInput = impl.inputSchema.parse(params.input);
    const authConfig = tool.authConfigEncrypted
      ? (JSON.parse(decryptSecret(tool.authConfigEncrypted)) as Record<string, unknown>)
      : undefined;

    const output = await impl.execute(parsedInput, { orgId: params.orgId, agentId: params.agentId, authConfig });

    await toolsRepo.recordToolExecution({
      toolId: tool.id,
      agentId: params.agentId,
      runId: params.runId,
      spanId: params.spanId,
      input: params.input,
      output,
      status: "success",
    });

    return { status: "success", output, durationMs: Date.now() - startedAt };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await toolsRepo.recordToolExecution({
      toolId: tool.id,
      agentId: params.agentId,
      runId: params.runId,
      spanId: params.spanId,
      input: params.input,
      status: "error",
      errorMessage,
    });
    return { status: "error", errorMessage, durationMs: Date.now() - startedAt };
  }
}
