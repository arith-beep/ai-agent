import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Temporary diagnostic sink for the OpenRouter 400 investigation — writes to
 * `_manager_agent_diag_log` (not a Drizzle-managed table, created directly in
 * Supabase) so the real request/response an API call failure carries is
 * inspectable without depending on Vercel runtime log access. Best-effort:
 * a failure here must never mask the original error.
 */
export async function recordManagerAgentDiag(entry: {
  orgId: string;
  phase: string;
  statusCode: number | undefined;
  url: string;
  requestBodyValues: unknown;
  responseBody: string | undefined;
}): Promise<void> {
  try {
    await getDb().execute(sql`
      INSERT INTO _manager_agent_diag_log (org_id, phase, status_code, url, request_body_values, response_body)
      VALUES (${entry.orgId}, ${entry.phase}, ${entry.statusCode ?? null}, ${entry.url}, ${JSON.stringify(entry.requestBodyValues ?? null)}::jsonb, ${entry.responseBody ?? null})
    `);
  } catch (error) {
    console.error("recordManagerAgentDiag: failed to write diagnostic row", error);
  }
}
