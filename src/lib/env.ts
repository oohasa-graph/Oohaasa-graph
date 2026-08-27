import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

const ingestionEnvSchema = z.object({
  INGEST_SECRET: z.string().min(1, "INGEST_SECRET is required"),
  SOURCE_USER_AGENT: z.string().min(1, "SOURCE_USER_AGENT is required"),
});

export function getDatabaseUrl(): string {
  return databaseEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
  }).DATABASE_URL;
}

export function getIngestionEnv(): z.infer<typeof ingestionEnvSchema> {
  return ingestionEnvSchema.parse({
    INGEST_SECRET: process.env.INGEST_SECRET,
    SOURCE_USER_AGENT: process.env.SOURCE_USER_AGENT,
  });
}
