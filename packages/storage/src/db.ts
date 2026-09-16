import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index";

// Cached on `globalThis` rather than module scope: `next dev` re-executes a
// route's module graph from scratch on every recompile (no Fast-Refresh
// state preservation on the server side), so a plain module-level singleton
// gets silently replaced on each edit — orphaning the old client's open
// connections, which postgres.js otherwise keeps alive indefinitely
// (idle_timeout is off by default). `globalThis` survives that
// re-evaluation, so the underlying connection is actually reused. Harmless
// in the worker/scheduler processes, which never re-evaluate this module.
declare global {
  // eslint-disable-next-line no-var
  var __aiAgentDbClient: postgres.Sql | undefined;
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getClient(): postgres.Sql {
  if (!globalThis.__aiAgentDbClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    globalThis.__aiAgentDbClient = postgres(url);
  }
  return globalThis.__aiAgentDbClient;
}

/** Lazily-created singleton Drizzle instance, shared across a process. */
export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema });
  }
  return dbInstance;
}

export type Database = ReturnType<typeof getDb>;
export { schema };
