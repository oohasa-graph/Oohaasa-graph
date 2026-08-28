import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import { createFortuneRepository } from "@/db/repository";
import * as schema from "@/db/schema";

export async function createTestRepository() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });

  return { client, repository: createFortuneRepository(db) };
}
