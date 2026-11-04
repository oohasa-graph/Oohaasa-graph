import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import type { IngestionAttempt, IngestionStatus, Source } from "@/features/fortune/domain";
import * as database from "@/db/client";
import { createPostHandler } from "@/app/api/internal/ingest/handler";
import { POST } from "@/app/api/internal/ingest/route";

const fixedNow = () => new Date("2026-08-25T20:15:00Z");

function makeRequest(body: {
  attempt: IngestionAttempt;
  source: Source | "all";
  force: boolean;
  sourceBody?: unknown;
  snapshotUrl?: string;
}, secret = "correct-secret") {
  return new Request("http://test/api/internal/ingest", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function result(source: Source, status: IngestionStatus) {
  return {
    source,
    targetDate: "2026-08-26",
    status,
    sourceDate: status === "stale" ? "2026-08-25" : "2026-08-26",
    runId: `${source}-run-1`,
    errorCode: status === "stale" ? "SOURCE_STALE" : null,
  } as const;
}

describe("POST /api/internal/ingest", () => {
  it("rejects unauthorized requests at the exported handler without database configuration", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("INGEST_SECRET", "correct-secret");
    vi.stubEnv("SOURCE_USER_AGENT", "synthetic-test");
    const getDb = vi.spyOn(database, "getDb");
    try {
      for (const authorization of [undefined, "Bearer wrong-secret", "Basic correct-secret"]) {
        const headers = authorization ? { authorization } : undefined;
        const response = await POST(new Request("http://test/api/internal/ingest", { method: "POST", headers }));
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "unauthorized" });
      }
      expect(getDb).not.toHaveBeenCalled();
      getDb.mockImplementation(() => { throw new Error("synthetic database initialization"); });
      expect(() => POST(makeRequest({ attempt: "primary", source: "gogo", force: false }))).toThrow("synthetic database initialization");
      expect(getDb).toHaveBeenCalledOnce();
      getDb.mockClear();
      vi.stubEnv("INGEST_SECRET", undefined);
      const unconfigured = await POST(makeRequest({ attempt: "primary", source: "gogo", force: false }));
      expect(unconfigured.status).toBe(401);
      expect(await unconfigured.json()).toEqual({ error: "unauthorized" });
      expect(getDb).not.toHaveBeenCalled();
    } finally {
      getDb.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  const snapshotUrl = "https://web.archive.org/web/20261025210000id_/https://www.tv-asahi.co.jp/goodmorning/uranai/";
  const backfill = { attempt: "backfill" as const, source: "gogo" as const, force: false, snapshotUrl, sourceBody: readFileSync("src/test/fixtures/gogo-current.html", "utf8") };
  const backfillNow = () => new Date("2026-10-27T00:00:00Z");
  it("derives the backfill edition date from content", async () => {
    const ingest = vi.fn().mockResolvedValue(result("gogo", "success"));
    const handler = createPostHandler({ ingest, now: backfillNow, secret: "correct-secret" });
    expect((await handler(makeRequest(backfill))).status).toBe(200);
    expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ attempt: "backfill", targetDate: "2026-10-26", snapshotUrl }));
  });
  it("rejects missing, mismatched, or non-backfill provenance", async () => {
    const ingest = vi.fn();
    const handler = createPostHandler({ ingest, now: backfillNow, secret: "correct-secret" });
    for (const body of [
      { ...backfill, snapshotUrl: undefined }, { ...backfill, sourceBody: undefined },
      { ...backfill, snapshotUrl: snapshotUrl.replace("20261025210000", "20261027150000") },
      { ...backfill, source: "all" as const },
      { ...backfill, snapshotUrl: snapshotUrl.replace("https://www.tv-asahi.co.jp/goodmorning/uranai/", "https://www.asahi.co.jp/data/ohaasa2020/horoscope.json") },
      { ...backfill, attempt: "manual" as const }, { ...backfill, snapshotUrl: "https://evil.example/archive" },
    ]) expect((await handler(makeRequest(body))).status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });
  it("keeps backfill content dates from passing today", async () => {
    const ingest = vi.fn().mockResolvedValue(result("gogo", "stale"));
    const handler = createPostHandler({ ingest, now: () => new Date("2026-10-25T13:00:00Z"), secret: "correct-secret" });
    const evening = { ...backfill, snapshotUrl: snapshotUrl.replace("20261025210000", "20261025120000") };
    expect((await handler(makeRequest(evening))).status).toBe(200);
    expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ targetDate: "2026-10-25" }));
  });
  it("records unparseable snapshots using the capture date without 424", async () => {
    const ingest = vi.fn().mockResolvedValue(result("gogo", "invalid"));
    const handler = createPostHandler({ ingest, now: backfillNow, secret: "correct-secret" });
    expect((await handler(makeRequest({ ...backfill, sourceBody: "<html></html>" }))).status).toBe(200);
    expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ targetDate: "2026-10-26", snapshotUrl }));
  });
  it("rejects missing or incorrect bearer secrets", async () => {
    const ingest = vi.fn();
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });

    expect((await handler(new Request("http://test/api/internal/ingest", { method: "POST" }))).status).toBe(401);
    expect((await handler(makeRequest({ attempt: "primary", source: "gogo", force: false }, "wrong-secret"))).status).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("validates request body before ingesting", async () => {
    const ingest = vi.fn();
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });
    const response = await handler(
      new Request("http://test/api/internal/ingest", {
        method: "POST",
        headers: { authorization: "Bearer correct-secret", "content-type": "application/json" },
        body: JSON.stringify({ attempt: "late", source: "gogo", force: false }),
      }),
    );

    expect(response.status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("ingests the selected source for the JST target date", async () => {
    const ingest = vi.fn().mockResolvedValue(result("gogo", "success"));
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });

    const response = await handler(makeRequest({ attempt: "primary", source: "gogo", force: false }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ targetDate: "2026-08-26", results: [result("gogo", "success")] });
    expect(ingest).toHaveBeenCalledWith({ source: "gogo", targetDate: "2026-08-26", attempt: "primary", force: false });
  });

  it("passes runner-fetched HTML to the ingestion service", async () => {
    const ingest = vi.fn().mockResolvedValue(result("gogo", "success"));
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });

    const response = await handler(makeRequest({
      attempt: "primary", source: "gogo", force: false, sourceBody: "<html>invented</html>",
    }));

    expect(response.status).toBe(200);
    expect(ingest).toHaveBeenCalledWith({
      source: "gogo", targetDate: "2026-08-26", attempt: "primary", force: false,
      sourceResponse: { body: "<html>invented</html>", httpStatus: 200 },
    });
  });

  it("rejects mismatched, all-source, or oversized forwarded content", async () => {
    const ingest = vi.fn();
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });
    for (const [source, sourceBody] of [
      ["gogo", []], ["ohaasa", "<html>"], ["all", "<html>"],
      ["gogo", "x".repeat(1_000_001)],
    ] as const) {
      expect((await handler(makeRequest({ attempt: "primary", source, force: false, sourceBody }))).status).toBe(400);
    }
    expect(ingest).not.toHaveBeenCalled();
  });

  it("ingests both sources for all", async () => {
    const ingest = vi.fn(async ({ source }: { source: Source }) => result(source, "already_complete"));
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });

    const response = await handler(makeRequest({ attempt: "retry_1", source: "all", force: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(2);
    expect(ingest).toHaveBeenNthCalledWith(1, { source: "ohaasa", targetDate: "2026-08-26", attempt: "retry_1", force: true });
    expect(ingest).toHaveBeenNthCalledWith(2, { source: "gogo", targetDate: "2026-08-26", attempt: "retry_1", force: true });
  });

  it("returns 424 on the final attempt when an expected source is unresolved", async () => {
    const ingest = vi.fn().mockResolvedValue(result("gogo", "stale"));
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });

    const response = await handler(makeRequest({ attempt: "final", source: "gogo", force: false }));

    expect(response.status).toBe(424);
  });

  it("also fails a manual recovery when the selected source remains unresolved", async () => {
    const ingest = vi.fn().mockResolvedValue(result("gogo", "fetch_error"));
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });

    const response = await handler(makeRequest({ attempt: "manual", source: "gogo", force: false }));

    expect(response.status).toBe(424);
  });

  it("does not fail the final attempt for terminal statuses", async () => {
    const ingest = vi.fn(async ({ source }: { source: Source }) =>
      source === "ohaasa" ? result(source, "not_expected") : result(source, "success"),
    );
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });

    const response = await handler(makeRequest({ attempt: "final", source: "all", force: false }));

    expect(response.status).toBe(200);
  });
});
