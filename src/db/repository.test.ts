import { describe, expect, it } from "vitest";

import { makeParsedEdition, metadata } from "@/test/factories";
import { createTestRepository } from "@/test/pglite";

describe("FortuneRepository", () => {
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
