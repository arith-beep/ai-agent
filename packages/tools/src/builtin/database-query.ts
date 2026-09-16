import { z } from "zod";
import type { BuiltinToolImplementation, ToolContext } from "../types";

const inputSchema = z.object({
  query: z.string().min(1),
  params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

/**
 * Runs a parameterized query against a database the org configures for this
 * tool (authConfig.connectionString) — never the platform's own database.
 */
export const databaseQueryTool: BuiltinToolImplementation<z.infer<typeof inputSchema>> = {
  key: "database_query",
  name: "Database Query",
  description: "Runs a parameterized SQL query against a configured Postgres/Supabase database and returns the rows.",
  category: "database",
  inputSchema,
  inputJsonSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      params: { type: "array", items: {} },
    },
    required: ["query"],
  },
  async execute(input, ctx: ToolContext) {
    const connectionString = ctx.authConfig?.connectionString;
    if (typeof connectionString !== "string" || connectionString.length === 0) {
      throw new Error("Database Query is not configured. Add a Postgres/Supabase connection string to this tool under Settings > Tools.");
    }

    const postgres = (await import("postgres")).default;
    const sql = postgres(connectionString, { max: 1, idle_timeout: 5, connect_timeout: 10 });
    try {
      const rows = await sql.unsafe(input.query, (input.params ?? []) as never[]);
      return { rows: [...rows], rowCount: rows.length };
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
};
