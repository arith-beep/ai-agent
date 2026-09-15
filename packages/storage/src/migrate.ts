import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  // pgvector must exist before the vector columns in generated migrations are applied.
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  await migrate(db, { migrationsFolder: "../../drizzle" });
  await sql.end();
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
