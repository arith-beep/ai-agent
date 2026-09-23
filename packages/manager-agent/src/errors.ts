import { APICallError, NoObjectGeneratedError, RetryError } from "ai";

const SECRET_PATTERN = /sk-[a-zA-Z0-9-]{10,}/g;

function redact(text: string): string {
  return text.replace(SECRET_PATTERN, "[redacted]");
}

function statusCategory(statusCode: number | undefined): string {
  if (statusCode === 401 || statusCode === 403) return "authentication rejected by OpenRouter — the configured API key is invalid, revoked, or lacks access to this model";
  if (statusCode === 402) return "OpenRouter reports insufficient credits/quota for this account";
  if (statusCode === 404) return "the configured model ID was not found or is not available on OpenRouter";
  if (statusCode === 408) return "the request to OpenRouter timed out";
  if (statusCode === 429) return "OpenRouter rate-limited this request";
  if (statusCode === 400) return "OpenRouter rejected the request as malformed (unsupported parameters for this model/provider)";
  if (statusCode !== undefined && statusCode >= 500) return "the upstream provider returned a server error";
  return "OpenRouter returned an error";
}

export type GenerationErrorDiagnostic = {
  userMessage: string;
  logDetail: string;
  /** Present only for an APICallError — the raw material for the diagnostic-log insert in runner.ts. */
  apiDetail?: {
    statusCode: number | undefined;
    url: string;
    responseBody: string | undefined;
    requestBodyValues: unknown;
  };
};

/**
 * Turns an error thrown by the AI SDK during evidence gathering or structured
 * synthesis into (a) a short, actionable category safe to show a manager in
 * the UI, and (b) a fuller sanitized detail string for server-side logs —
 * never the raw request (which could carry the Authorization header).
 */
export function describeGenerationError(error: unknown, phase: "evidence gathering" | "brief synthesis"): GenerationErrorDiagnostic {
  const unwrapped = error instanceof RetryError ? (error.lastError ?? error) : error;

  if (unwrapped instanceof APICallError) {
    const category = statusCategory(unwrapped.statusCode);
    const upstreamMessage = redact(unwrapped.message ?? "");
    const bodySnippet = typeof unwrapped.responseBody === "string" ? redact(unwrapped.responseBody).slice(0, 500) : undefined;
    return {
      userMessage: `OpenRouter call failed during ${phase} (HTTP ${unwrapped.statusCode ?? "unknown"}): ${category}. Upstream message: "${upstreamMessage}".`,
      logDetail: `[manager-agent] APICallError during ${phase}: status=${unwrapped.statusCode} url=${unwrapped.url} isRetryable=${unwrapped.isRetryable} message=${upstreamMessage} body=${bodySnippet}`,
      apiDetail: {
        statusCode: unwrapped.statusCode,
        url: unwrapped.url,
        responseBody: typeof unwrapped.responseBody === "string" ? redact(unwrapped.responseBody) : undefined,
        requestBodyValues: unwrapped.requestBodyValues,
      },
    };
  }

  if (unwrapped instanceof NoObjectGeneratedError) {
    return {
      userMessage: `The model responded during ${phase} but its output didn't match the expected structure — it may not support structured/JSON output reliably. Try a different model.`,
      logDetail: `[manager-agent] NoObjectGeneratedError during ${phase}: ${redact(String(unwrapped.text ?? ""))}`,
    };
  }

  const message = unwrapped instanceof Error ? unwrapped.message : String(unwrapped);
  return {
    userMessage: `Generation failed during ${phase}: ${redact(message)}`,
    logDetail: `[manager-agent] Unexpected error during ${phase}: ${redact(message)}`,
  };
}
