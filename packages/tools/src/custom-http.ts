import type { CustomToolExecutionConfig } from "@ai-agent/shared-types";

const MAX_RESPONSE_BYTES = 1_000_000;
const TIMEOUT_MS = 15_000;

/**
 * Validates a plain, flat JSON Schema object (the shape the custom-tool
 * builder UI produces via paramsToJsonSchema) — not a general-purpose JSON
 * Schema validator. Fine for org-defined tools whose params are simple
 * string/number/boolean fields; nested schemas aren't supported yet.
 */
export function validateAgainstFlatJsonSchema(schema: Record<string, unknown>, input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Tool input must be an object.");
  }
  const record = input as Record<string, unknown>;
  const properties = (schema.properties as Record<string, { type?: string }> | undefined) ?? {};
  const required = (schema.required as string[] | undefined) ?? [];

  for (const field of required) {
    if (record[field] === undefined || record[field] === null) {
      throw new Error(`Missing required field "${field}".`);
    }
  }
  for (const [field, value] of Object.entries(record)) {
    const expectedType = properties[field]?.type;
    if (!expectedType || value === undefined || value === null) continue;
    const actualType = typeof value;
    const matches =
      (expectedType === "string" && actualType === "string") ||
      (expectedType === "number" && actualType === "number") ||
      (expectedType === "boolean" && actualType === "boolean");
    if (!matches) throw new Error(`Field "${field}" must be a ${expectedType}, got ${actualType}.`);
  }
  return record;
}

function resolvePath(scope: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, scope);
}

const WHOLE_PLACEHOLDER = /^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/;
const INLINE_PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/** Replaces `{{path}}` tokens with values from `scope` (dot-path lookup). A string that is *only* a placeholder keeps the resolved value's own type; an embedded placeholder is stringified. */
function substitute(value: unknown, scope: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    const wholeMatch = value.match(WHOLE_PLACEHOLDER);
    if (wholeMatch) return resolvePath(scope, wholeMatch[1] ?? "");
    return value.replace(INLINE_PLACEHOLDER, (_match, path: string) => {
      const resolved = resolvePath(scope, path);
      return resolved === undefined ? "" : String(resolved);
    });
  }
  if (Array.isArray(value)) return value.map((item) => substitute(item, scope));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, substitute(val, scope)]));
  }
  return value;
}

export async function executeCustomHttpTool(
  config: CustomToolExecutionConfig,
  input: Record<string, unknown>,
  authConfig: Record<string, unknown> | undefined,
): Promise<{ status: number; statusText: string; headers: Record<string, string>; body: string; truncated: boolean }> {
  const scope = { input, auth: authConfig ?? {} };
  const url = substitute(config.url, scope);
  if (typeof url !== "string" || url.length === 0) throw new Error("Custom tool's URL template resolved to an empty value.");
  const headers = config.headers ? (substitute(config.headers, scope) as Record<string, string>) : undefined;
  const body = config.body !== undefined ? substitute(config.body, scope) : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: config.method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    const truncated = text.length > MAX_RESPONSE_BYTES;
    if (!response.ok) {
      throw new Error(`Custom tool HTTP call failed: ${response.status} ${response.statusText} — ${text.slice(0, 500)}`);
    }
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: truncated ? text.slice(0, MAX_RESPONSE_BYTES) : text,
      truncated,
    };
  } finally {
    clearTimeout(timeout);
  }
}
