import { describe, expect, it } from "vitest";
import { cdxQueryUrl, describeResult, parseCdxTimestamps, snapshotRawUrl } from "./wayback";
import { parseSnapshotUrl } from "./snapshot";
import { SOURCE_URLS } from "@/features/fortune/source-urls";

describe("Wayback runner helpers", () => {
  it("builds the bounded CDX query", () => {
    expect(cdxQueryUrl("gogo", "2021-06-01", "2026-10-25")).toBe("https://web.archive.org/cdx/search/cdx?url=www.tv-asahi.co.jp/goodmorning/uranai/&output=json&fl=timestamp&filter=statuscode:200&from=20210601&to=20261025");
  });
  it("sorts and deduplicates valid capture timestamps", () => {
    expect(parseCdxTimestamps([["timestamp"], ["20250601013136"], ["bad"], ["20250101000000"], ["20250601013136"]])).toEqual(["20250101000000", "20250601013136"]);
    expect(parseCdxTimestamps({})).toEqual([]);
    expect(parseCdxTimestamps([null, [], [42]])).toEqual([]);
  });
  it("round trips raw snapshot URLs", () => {
    expect(parseSnapshotUrl(snapshotRawUrl("ohaasa", "20250601013136"))?.originalUrl).toBe(SOURCE_URLS.ohaasa);
  });
  it("describes statuses without printing arbitrary payload fields", () => {
    expect(describeResult("gogo", "20250601013136", { status: "success", targetDate: "2025-06-02", comment: "Invented prose" } as never)).toBe("gogo 20250601013136 -> success 2025-06-02");
  });
});
