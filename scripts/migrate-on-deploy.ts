import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { shouldMigrate } from "../src/db/migrate-on-deploy";

async function main() {
  if (!shouldMigrate(process.env)) {
    console.log(`migrations skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`);
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log("migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  // Database errors may include row contents or credentials.
  console.error("migrations failed");
  process.exitCode = 1;
});
