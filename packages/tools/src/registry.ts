import type { BuiltinToolImplementation } from "./types";
import { httpRequestTool } from "./builtin/http-request";
import { fileReaderTool } from "./builtin/file-reader";
import { webSearchTool } from "./builtin/web-search";

export const BUILTIN_TOOLS: Record<string, BuiltinToolImplementation> = {
  [httpRequestTool.key]: httpRequestTool as BuiltinToolImplementation,
  [fileReaderTool.key]: fileReaderTool as BuiltinToolImplementation,
  [webSearchTool.key]: webSearchTool as BuiltinToolImplementation,
};

export function getBuiltinTool(key: string): BuiltinToolImplementation | undefined {
  return BUILTIN_TOOLS[key];
}
