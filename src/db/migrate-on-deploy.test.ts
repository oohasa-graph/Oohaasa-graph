import { describe, expect, it } from "vitest";
import { shouldMigrate } from "./migrate-on-deploy";

describe("production migrations", () => {
  it("runs only in Vercel production", () => {
    expect(shouldMigrate({ VERCEL_ENV: "production" })).toBe(true);
    expect(shouldMigrate({ VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldMigrate({})).toBe(false);
  });
});
