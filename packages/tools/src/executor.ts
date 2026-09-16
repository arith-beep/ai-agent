import { decryptSecret } from "@ai-agent/crypto";
import { toolsRepo, schema } from "@ai-agent/storage";
import { customToolExecutionConfigSchema, type ToolExecutionResult } from "@ai-agent/shared-types";
import { getBuiltinTool } from "./registry";
import { executeCustomHttpTool, validateAgainstFlatJsonSchema } from "./custom-http";

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
  const startedAtDate = new Date();
  const startedAt = startedAtDate.getTime();
  const { tool } = params;

  try {
    const authConfig = tool.authConfigEncrypted
      ? (JSON.parse(decryptSecret(tool.authConfigEncrypted)) as Record<string, unknown>)
      : undefined;

    let output: unknown;
    if (tool.builtinKey) {
      const impl = getBuiltinTool(tool.builtinKey);
      if (!impl) throw new Error(`No implementation registered for builtin tool key "${tool.builtinKey}".`);
      const parsedInput = impl.inputSchema.parse(params.input);
      output = await impl.execute(parsedInput, { orgId: params.orgId, agentId: params.agentId, authConfig });
    } else if (tool.executionConfig) {
      const config = customToolExecutionConfigSchema.parse(tool.executionConfig);
      const parsedInput = validateAgainstFlatJsonSchema(tool.inputSchema, params.input);
      output = await executeCustomHttpTool(config, parsedInput, authConfig);
    } else {
      throw new Error(`Tool "${tool.name}" has no runtime implementation — it is neither a builtin tool nor a configured custom tool.`);
    }

    await toolsRepo.recordToolExecution({
      toolId: tool.id,
      agentId: params.agentId,
      runId: params.runId,
      spanId: params.spanId,
      input: params.input,
      output,
      status: "success",
      startedAt: startedAtDate,
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
      startedAt: startedAtDate,
    });
    return { status: "error", errorMessage, durationMs: Date.now() - startedAt };
  }
}
