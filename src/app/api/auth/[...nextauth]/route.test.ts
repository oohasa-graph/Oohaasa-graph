import { afterEach, describe, expect, it, vi } from "vitest";

const { verifyCredentials } = vi.hoisted(() => ({ verifyCredentials: vi.fn() }));
vi.mock("@/auth/credentials", () => ({ verifyCredentials, getAuthEnv: vi.fn() }));

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";

const context = (...nextauth: string[]) => ({ params: Promise.resolve({ nextauth }) });

describe("/api/auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays unmounted and never checks a password unless sign-in is explicitly enabled", async () => {
    for (const value of ["", "0", "true"]) {
      vi.stubEnv("AUTH_ENABLED", value);
      const post = await POST(new Request("http://localhost/api/auth/callback/credentials", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "username=owner&password=guess",
      }), context("callback", "credentials"));
      expect(post.status).toBe(404);
      expect((await GET(new Request("http://localhost/api/auth/session"), context("session"))).status).toBe(404);
    }
    expect(verifyCredentials).not.toHaveBeenCalled();
  });
});
