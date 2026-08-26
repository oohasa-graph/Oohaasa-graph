import { Pool } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";

import * as schema from "@/db/schema";
import { getDatabaseUrl } from "@/lib/env";

let pool: Pool | undefined;
let database: NeonDatabase<typeof schema> | undefined;

export function getDb(): NeonDatabase<typeof schema> {
  if (!database) {
    pool = new Pool({ connectionString: getDatabaseUrl() });
    database = drizzle(pool, { schema });
  }

  return database;
}
