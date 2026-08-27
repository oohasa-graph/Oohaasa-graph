import { compare } from "bcryptjs";
import { z } from "zod";

const authEnvSchema = z.object({
  PRIVATE_USERNAME: z.string().min(1, "PRIVATE_USERNAME is required"),
  PRIVATE_PASSWORD_HASH: z.string().min(1, "PRIVATE_PASSWORD_HASH is required"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a URL"),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function getAuthEnv(): AuthEnv {
  return authEnvSchema.parse({
    PRIVATE_USERNAME: process.env.PRIVATE_USERNAME,
    PRIVATE_PASSWORD_HASH: process.env.PRIVATE_PASSWORD_HASH,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  });
}

export async function verifyCredentials(
  username: unknown,
  password: unknown,
  env: AuthEnv = getAuthEnv(),
): Promise<{ id: string; name: string } | null> {
  if (typeof username !== "string" || typeof password !== "string") {
    return null;
  }

  if (username !== env.PRIVATE_USERNAME) {
    return null;
  }

  const passwordMatches = await compare(password, env.PRIVATE_PASSWORD_HASH);
  if (!passwordMatches) {
    return null;
  }

  return { id: env.PRIVATE_USERNAME, name: env.PRIVATE_USERNAME };
}
