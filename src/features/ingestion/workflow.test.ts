import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`.github/workflows/${name}`, "utf8");

describe("secret-bearing workflow hardening", () => {
  it("grants the ingest job no GITHUB_TOKEN scopes", () => {
    expect(read("ingest.yml")).toContain("\npermissions: {}\n");
  });

  it.each(["backfill.yml", "export-data.yml"])("skips dependency install scripts in %s", (name) => {
    const workflow = read(name);
    expect(workflow).toContain("run: npm ci --ignore-scripts");
    expect(workflow).not.toMatch(/run: npm ci\s*$/m);
  });
});
