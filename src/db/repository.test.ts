import { describe, expect, it } from "vitest";

import { editions } from "@/db/schema";
import { makeParsedEdition, metadata } from "@/test/factories";
import { createTestRepository } from "@/test/pglite";

describe("FortuneRepository", () => {
  it("exports bounded editions with all fields, provenance and rank ordering", async () => {
    const { client, repository } = await createTestRepository();
    try {
      const snapshotUrl = "https://web.archive.org/web/20261001000000id_/https://www.tv-asahi.co.jp/goodmorning/uranai/";
      const edition = makeParsedEdition({ source: "gogo", date: "2026-10-01" });
      await repository.saveEdition(edition, { ...metadata("a"), origin: "wayback", snapshotUrl });
      await repository.saveEdition(makeParsedEdition({ source: "ohaasa", date: "2026-10-05" }), metadata("b"));
      const rows = await repository.listEditions(
        "2026-10-01", "2026-10-03",
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ ...edition, fortunes: [...edition.fortunes].sort((a, b) => a.rank - b.rank), ...metadata("a"), fetchedAt: metadata("a").fetchedAt.toISOString(), origin: "wayback", snapshotUrl });
      expect(await repository.listEditions(
        "2020-01-01", "2020-01-02",
      )).toEqual([]);
    } finally { await client.close(); }
  });
  it("stores edition origin and snapshot url", async () => {
    const { client, db, repository } = await createTestRepository();
    const snapshotUrl = "https://web.archive.org/web/20261001000000id_/https://www.tv-asahi.co.jp/goodmorning/uranai/";
    try {
      await repository.saveEdition(makeParsedEdition({ source: "gogo", date: "2026-10-01" }), {
        ...metadata("a"), origin: "wayback", snapshotUrl,
      });
      const [row] = await db.select().from(editions);
      expect(row).toMatchObject({ origin: "wayback", snapshotUrl });
    } finally { await client.close(); }
  });

  it("insertEditionIfAbsent never replaces an existing edition", async () => {
    const { client, repository } = await createTestRepository();
    try {
      await repository.saveEdition(makeParsedEdition({ source: "gogo", date: "2026-10-01", libraRank: 3 }), metadata("a"));
      expect(await repository.insertEditionIfAbsent(makeParsedEdition({ source: "gogo", date: "2026-10-01", libraRank: 9 }), {
        ...metadata("b"), origin: "wayback", snapshotUrl: "https://web.archive.org/web/20261001000000id_/https://www.tv-asahi.co.jp/goodmorning/uranai/",
      })).toBe(false);
      expect(await repository.getRank("gogo", "2026-10-01", "libra")).toBe(3);
    } finally { await client.close(); }
  });

  it("insertEditionIfAbsent inserts a missing edition", async () => {
    const { client, repository } = await createTestRepository();
    try {
      expect(await repository.insertEditionIfAbsent(makeParsedEdition({ source: "gogo", date: "2026-10-01" }), metadata("a"))).toBe(true);
      expect(await repository.countEntries("gogo", "2026-10-01")).toBe(12);
    } finally { await client.close(); }
  });

  it("saves one edition and exactly twelve entries atomically", async () => {
    const { client, repository } = await createTestRepository();

    try {
      await repository.saveEdition(
        makeParsedEdition({ source: "gogo", date: "2026-08-26" }),
        metadata("a"),
      );

      expect(await repository.hasEdition("gogo", "2026-08-26")).toBe(true);
      expect(await repository.countEntries("gogo", "2026-08-26")).toBe(12);
    } finally {
      await client.close();
    }
  });

  it("replaces all rows during a forced same-day correction", async () => {
    const { client, repository } = await createTestRepository();

    try {
      await repository.saveEdition(
        makeParsedEdition({
          source: "gogo",
          date: "2026-08-26",
          libraRank: 2,
        }),
        metadata("a"),
      );
      await repository.saveEdition(
        makeParsedEdition({
          source: "gogo",
          date: "2026-08-26",
          libraRank: 1,
        }),
        metadata("b"),
      );

      expect(await repository.getRank("gogo", "2026-08-26", "libra")).toBe(1);
      expect(await repository.countEntries("gogo", "2026-08-26")).toBe(12);
    } finally {
      await client.close();
    }
  });

  it("rolls back a same-day replacement when a replacement row is invalid", async () => {
    const { client, repository } = await createTestRepository();

    try {
      await repository.saveEdition(
        makeParsedEdition({
          source: "gogo",
          date: "2026-08-26",
          libraRank: 2,
        }),
        metadata("a"),
      );
      const invalidCorrection = makeParsedEdition({
        source: "gogo",
        date: "2026-08-26",
        libraRank: 1,
      });
      invalidCorrection.fortunes[1].rank = invalidCorrection.fortunes[0].rank;

      await expect(
        repository.saveEdition(invalidCorrection, metadata("b")),
      ).rejects.toThrow();
      expect(await repository.getRank("gogo", "2026-08-26", "libra")).toBe(2);
      expect(await repository.countEntries("gogo", "2026-08-26")).toBe(12);
    } finally {
      await client.close();
    }
  });

  it("derives a controlled run summary and ignores unsafe free-form caller text", async () => {
    const { client, repository } = await createTestRepository();

    try {
      const runId = await repository.startRun({
        source: "gogo",
        targetDate: "2026-08-26",
        attempt: "retry_1",
        startedAt: new Date("2026-08-25T22:30:00Z"),
      });
      const unsafePayload = "Invented source-derived response prose ".repeat(20);
      const unsafeResult = {
        status: "fetch_error" as const,
        sourceDate: null,
        httpStatus: 503,
        contentHash: null,
        errorCode: "SOURCE_FETCH_FAILED" as const,
        errorSummary: unsafePayload,
        finishedAt: new Date("2026-08-25T22:30:05Z"),
      };

      await repository.finishRun(runId, unsafeResult);

      const result = await client.query<{
        status: string;
        http_status: number;
        error_code: string;
        error_summary: string;
      }>(
        "select status, http_status, error_code, error_summary from ingestion_runs where id = $1",
        [runId],
      );
      expect(result.rows).toEqual([
        {
          status: "fetch_error",
          http_status: 503,
          error_code: "SOURCE_FETCH_FAILED",
          error_summary: "Source request failed",
        },
      ]);
      expect(result.rows[0].error_summary).not.toContain(unsafePayload);
    } finally {
      await client.close();
    }
  });

  it("rejects an unknown ingestion error code at runtime", async () => {
    const { client, repository } = await createTestRepository();

    try {
      const runId = await repository.startRun({
        source: "gogo",
        targetDate: "2026-08-26",
        attempt: "retry_1",
        startedAt: new Date("2026-08-25T22:30:00Z"),
      });

      await expect(
        repository.finishRun(runId, {
          status: "fetch_error",
          sourceDate: null,
          errorCode: "Invented full response body" as never,
        }),
      ).rejects.toThrow(/unsupported ingestion error code/i);
    } finally {
      await client.close();
    }
  });

  it("enforces the database size bound for run summaries", async () => {
    const { client, repository } = await createTestRepository();

    try {
      const runId = await repository.startRun({
        source: "gogo",
        targetDate: "2026-08-26",
        attempt: "retry_1",
        startedAt: new Date("2026-08-25T22:30:00Z"),
      });

      await expect(
        client.query(
          "update ingestion_runs set error_summary = $1 where id = $2",
          ["x".repeat(121), runId],
        ),
      ).rejects.toThrow();
    } finally {
      await client.close();
    }
  });
});
