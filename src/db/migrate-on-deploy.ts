export function shouldMigrate(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV === "production";
}
