import { hash } from "bcryptjs";
import { describe, expect, it } from "vitest";

import { verifyCredentials, type AuthEnv } from "@/auth/credentials";

async function testEnv(): Promise<AuthEnv> {
  return {
    PRIVATE_USERNAME: "owner",
    PRIVATE_PASSWORD_HASH: await hash("correct horse", 4),
    NEXTAUTH_SECRET: "test-secret-with-at-least-thirty-two-characters",
    NEXTAUTH_URL: "http://localhost:3000",
  };
}

describe("verifyCredentials", () => {
  it("accepts only the configured username and bcrypt password", async () => {
    const env = await testEnv();

    await expect(verifyCredentials("owner", "correct horse", env)).resolves.toEqual({
      id: "owner",
      name: "owner",
    });
    await expect(verifyCredentials("owner", "wrong", env)).resolves.toBeNull();
    await expect(verifyCredentials("other", "correct horse", env)).resolves.toBeNull();
  });

  it("rejects missing, empty, or malformed credential input", async () => {
    const env = await testEnv();

    await expect(verifyCredentials(undefined, "correct horse", env)).resolves.toBeNull();
    await expect(verifyCredentials("owner", undefined, env)).resolves.toBeNull();
    await expect(verifyCredentials("", "correct horse", env)).resolves.toBeNull();
  });
});
