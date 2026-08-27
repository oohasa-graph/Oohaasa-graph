import { describe, expect, it, vi } from "vitest";

import type { IngestionAttempt, IngestionStatus, Source } from "@/features/fortune/domain";
import { createPostHandler } from "@/app/api/internal/ingest/route";

const fixedNow = () => new Date("2026-08-25T20:15:00Z");

function makeRequest(body: {
  attempt: IngestionAttempt;
  source: Source | "all";
  force: boolean;
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

  it("does not fail the final attempt for terminal statuses", async () => {
    const ingest = vi.fn(async ({ source }: { source: Source }) =>
      source === "ohaasa" ? result(source, "not_expected") : result(source, "success"),
    );
    const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });

    const response = await handler(makeRequest({ attempt: "final", source: "all", force: false }));

    expect(response.status).toBe(200);
  });
});
