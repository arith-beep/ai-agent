import postgres from "postgres";
import type { NodeHandler } from "../types";

/**
 * Runs a parameterized query against a database the workflow author
 * configures (connectionString in node config) — deliberately NOT the
 * platform's own database, so a workflow can never reach outside its
 * declared target.
 */
export const dbQueryStepHandler: NodeHandler = async (node) => {
  if (node.type !== "db_query") throw new Error("dbQueryStepHandler received a non-db_query node");
  const config = node.config as { connectionString: string; query: string; params?: unknown[] };
  if (!config.connectionString) {
    throw new Error("db_query node is missing a connectionString in its config.");
  }
  const sql = postgres(config.connectionString, { max: 1, idle_timeout: 5, connect_timeout: 10 });
  try {
    const rows = await sql.unsafe(config.query, (config.params ?? []) as never[]);
    return { type: "ok", output: { rows: [...rows] } };
  } finally {
    await sql.end({ timeout: 5 });
  }
};
