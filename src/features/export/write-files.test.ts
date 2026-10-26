import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { editionFilePath, writeExportFiles } from "./write-files";
import { makeParsedEdition, metadata } from "@/test/factories";

describe("private edition files", () => {
  it("uses source, year and edition date as the file path", () => {
    expect(editionFilePath({ source: "gogo", editionDate: "2026-10-26" })).toBe("editions/gogo/2026/2026-10-26.json");
  });
  it("writes exact full editions idempotently without logging prose", async () => {
    const root = await mkdtemp(join(tmpdir(), "market-export-"));
    const log = vi.spyOn(console, "log");
    const editions = (["gogo", "ohaasa"] as const).map((source) => {
      const edition = makeParsedEdition({ source, date: "2026-10-26" });
      edition.fortunes[0].comment = "Invented hidden prose";
      return { ...edition, ...metadata("a"), fetchedAt: metadata("a").fetchedAt.toISOString() };
    });
    try {
      expect(await writeExportFiles({ editions }, root)).toEqual({ written: 2, unchanged: 0 });
      expect(await readFile(join(root, editionFilePath(editions[0])), "utf8")).toBe(JSON.stringify(editions[0], null, 2) + "\n");
      expect(await writeExportFiles({ editions }, root)).toEqual({ written: 0, unchanged: 2 });
      expect(JSON.stringify(log.mock.calls)).not.toContain("Invented hidden prose");
      expect(await writeExportFiles({ editions: [] }, root)).toEqual({ written: 0, unchanged: 0 });
    } finally { log.mockRestore(); await rm(root, { recursive: true, force: true }); }
  });
  it("rejects paths derived from malformed source or dates", () => {
    expect(() => editionFilePath({ source: "../bad" as never, editionDate: "2026-10-26" })).toThrow();
    expect(() => editionFilePath({ source: "gogo", editionDate: "../../bad" })).toThrow();
  });
});
