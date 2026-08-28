import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { FortuneRepository } from "@/db/repository";
import type { Source } from "@/features/fortune/domain";
import { SourceFetchError } from "@/features/fortune/errors";
import { fetchJson, fetchText } from "@/features/ingestion/http";
import {
  ingestSource,
  type IngestSourceInput,
  type SourceClients,
} from "@/features/ingestion/service";
import ohaasaFixture from "@/test/fixtures/ohaasa-valid.json";

const gogoHtml = readFileSync("src/test/fixtures/gogo-valid.html", "utf8");
const fixedTime = new Date("2026-08-25T20:15:00Z");

function makeServiceInput(
  options: {
    source?: Source;
    targetDate?: string;
    hasEdition?: boolean;
    body?: unknown;
    force?: boolean;
  } = {},
) {
  const source = options.source ?? "gogo";
  const targetDate = options.targetDate ?? "2026-08-26";
  const repository = {
    hasEdition: vi.fn().mockResolvedValue(options.hasEdition ?? false),
    saveEdition: vi.fn().mockResolvedValue(undefined),
    startRun: vi.fn().mockResolvedValue("run-1"),
    finishRun: vi.fn().mockResolvedValue(undefined),
    countEntries: vi.fn().mockResolvedValue(0),
    getRank: vi.fn().mockResolvedValue(null),
  } satisfies FortuneRepository;
  const selectedFetch = vi.fn().mockResolvedValue({
    body:
      options.body ??
      (source === "gogo" ? gogoHtml : structuredClone(ohaasaFixture)),
    httpStatus: 200,
  });
  const clients = {
    ohaasa: { fetch: source === "ohaasa" ? selectedFetch : vi.fn() },
    gogo: { fetch: source === "gogo" ? selectedFetch : vi.fn() },
  } satisfies SourceClients;
  const input = {
    source,
    targetDate,
    attempt: "primary" as const,
    force: options.force ?? false,
    repository,
    clients,
    now: () => new Date(fixedTime),
  } satisfies IngestSourceInput;

  return { repository, selectedFetch, input };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("bounded HTTP helpers", () => {
  it("fetches text with a ten-second timeout, no-store cache, and identifying user agent", async () => {
    const response = new Response("invented response", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    const timeoutSignal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchText(
        "https://example.invalid/fortune",
        "fortune-graph/1.0 (contact: test@example.invalid)",
      ),
    ).resolves.toEqual({ body: "invented response", httpStatus: 200 });
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(fetchMock).toHaveBeenCalledWith("https://example.invalid/fortune", {
      cache: "no-store",
      headers: {
        "user-agent": "fortune-graph/1.0 (contact: test@example.invalid)",
      },
      signal: timeoutSignal,
    });
  });

  it("fetches JSON without changing the response payload", async () => {
    const body = { edition: "invented", entries: 12 };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchJson("https://example.invalid/fortune", "fortune-graph/1.0"),
    ).resolves.toEqual({ body, httpStatus: 200 });
  });

  it("sanitizes HTTP, network, and invalid-JSON failures", async () => {
    const sourceProse = "Invented response prose that must remain private";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(sourceProse, { status: 503 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const httpFailure = await fetchText(
      "https://example.invalid/fortune",
      "fortune-graph/1.0",
    ).catch((error: unknown) => error);
    expect(httpFailure).toBeInstanceOf(SourceFetchError);
    expect(httpFailure).toMatchObject({ code: "HTTP_503" });
    expect(JSON.stringify(httpFailure)).not.toContain(sourceProse);

    fetchMock.mockRejectedValueOnce(new Error(sourceProse));
    const networkFailure = await fetchText(
      "https://example.invalid/fortune",
      "fortune-graph/1.0",
    ).catch((error: unknown) => error);
    expect(networkFailure).toBeInstanceOf(SourceFetchError);
    expect(networkFailure).toMatchObject({ code: "REQUEST_FAILED" });
    expect(JSON.stringify(networkFailure)).not.toContain(sourceProse);

    fetchMock.mockResolvedValueOnce(new Response(sourceProse, { status: 200 }));
    const jsonFailure = await fetchJson(
      "https://example.invalid/fortune",
      "fortune-graph/1.0",
    ).catch((error: unknown) => error);
    expect(jsonFailure).toBeInstanceOf(SourceFetchError);
    expect(jsonFailure).toMatchObject({ code: "INVALID_JSON" });
    expect(JSON.stringify(jsonFailure)).not.toContain(sourceProse);
  });
});

describe("ingestSource", () => {
  it("records not_expected before checking persistence or fetching Ohaasa", async () => {
    const test = makeServiceInput({
      source: "ohaasa",
      targetDate: "2026-08-15",
      hasEdition: true,
    });

    await expect(ingestSource(test.input)).resolves.toEqual({
      source: "ohaasa",
      targetDate: "2026-08-15",
      status: "not_expected",
      sourceDate: null,
      runId: "run-1",
      errorCode: null,
    });
    expect(test.repository.hasEdition).not.toHaveBeenCalled();
    expect(test.selectedFetch).not.toHaveBeenCalled();
    expect(test.repository.finishRun).toHaveBeenCalledWith("run-1", {
      status: "not_expected",
      sourceDate: null,
      httpStatus: null,
      contentHash: null,
      errorCode: null,
      finishedAt: fixedTime,
    });
  });

  it("does not fetch an already completed source", async () => {
    const test = makeServiceInput({ hasEdition: true });

    expect((await ingestSource(test.input)).status).toBe("already_complete");
    expect(test.selectedFetch).not.toHaveBeenCalled();
    expect(test.repository.saveEdition).not.toHaveBeenCalled();
  });

  it("records stale data without saving it", async () => {
    const stale = structuredClone(ohaasaFixture);
    stale[0].onair_date = "20260825";
    const test = makeServiceInput({ source: "ohaasa", body: stale });

    await expect(ingestSource(test.input)).resolves.toMatchObject({
      status: "stale",
      sourceDate: "2026-08-25",
      errorCode: "SOURCE_STALE",
    });
    expect(test.repository.saveEdition).not.toHaveBeenCalled();
    expect(test.repository.finishRun).toHaveBeenCalledWith("run-1", {
      status: "stale",
      sourceDate: "2026-08-25",
      httpStatus: 200,
      contentHash: null,
      errorCode: "SOURCE_STALE",
      finishedAt: fixedTime,
    });
  });

  it("saves one valid edition with complete safe run metadata", async () => {
    const test = makeServiceInput({ source: "gogo" });

    await expect(ingestSource(test.input)).resolves.toMatchObject({
      status: "success",
      source: "gogo",
      errorCode: null,
    });
    expect(test.repository.saveEdition).toHaveBeenCalledTimes(1);
    const metadata = test.repository.saveEdition.mock.calls[0][1];
    expect(metadata).toMatchObject({ parserVersion: 1, fetchedAt: fixedTime });
    expect(metadata.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(test.repository.finishRun).toHaveBeenCalledWith("run-1", {
      status: "success",
      sourceDate: "2026-08-26",
      httpStatus: 200,
      contentHash: metadata.contentHash,
      errorCode: null,
      finishedAt: fixedTime,
    });
  });

  it("force bypasses only hasEdition and still rejects invalid source content", async () => {
    const sourceProse = "Invented malformed source prose";
    const test = makeServiceInput({
      hasEdition: true,
      force: true,
      body: { sourceProse },
    });

    await expect(ingestSource(test.input)).resolves.toMatchObject({
      status: "invalid",
      errorCode: "EDITION_INVALID",
    });
    expect(test.repository.hasEdition).not.toHaveBeenCalled();
    expect(test.selectedFetch).toHaveBeenCalledTimes(1);
    expect(test.repository.saveEdition).not.toHaveBeenCalled();
    expect(JSON.stringify(test.repository.finishRun.mock.calls)).not.toContain(sourceProse);
  });

  it("normalizes every source fetch error before finalizing the run", async () => {
    const unsafeCode = "Invented upstream code and prose";
    const test = makeServiceInput();
    test.selectedFetch.mockRejectedValueOnce(new SourceFetchError(unsafeCode));

    const result = await ingestSource(test.input);

    expect(result).toMatchObject({
      status: "fetch_error",
      sourceDate: null,
      errorCode: "SOURCE_FETCH_FAILED",
    });
    expect(test.repository.finishRun).toHaveBeenCalledWith("run-1", {
      status: "fetch_error",
      sourceDate: null,
      httpStatus: null,
      contentHash: null,
      errorCode: "SOURCE_FETCH_FAILED",
      finishedAt: fixedTime,
    });
    expect(JSON.stringify({ result, calls: test.repository.finishRun.mock.calls })).not.toContain(
      unsafeCode,
    );
  });

  it("hashes normalized editions deterministically regardless of fortune order", async () => {
    const reversed = structuredClone(ohaasaFixture);
    reversed[0].detail.reverse();
    const reversedTest = makeServiceInput({ source: "ohaasa", body: reversed });
    const canonicalTest = makeServiceInput({ source: "ohaasa" });

    await ingestSource(reversedTest.input);
    await ingestSource(canonicalTest.input);

    const reversedHash = reversedTest.repository.saveEdition.mock.calls[0][1].contentHash;
    const canonicalHash = canonicalTest.repository.saveEdition.mock.calls[0][1].contentHash;
    expect(reversedHash).toBe(canonicalHash);
    expect(canonicalHash).toBe(
      "c09c8e35723dc4426cc0bee286acf826b9c8a2c48efd93cc26debc5bae02f149",
    );
  });
});
