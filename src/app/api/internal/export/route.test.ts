import { describe, expect, it, vi } from "vitest";
import { createGetHandler } from "./route";
import { makeParsedEdition, metadata } from "@/test/factories";

const edition = { ...makeParsedEdition({ source: "gogo", date: "2026-10-01" }), ...metadata("a"), fetchedAt: metadata("a").fetchedAt.toISOString() };
const request = (query: string, secret?: string) => new Request(`https://test/api/internal/export${query}`, { headers: secret ? { Authorization: `Bearer ${secret}` } : {} });

describe("read-only edition export", () => {
  it("rejects missing and wrong secrets before querying", async () => {
    const listEditions = vi.fn();
    const get = createGetHandler({ secret: "correct", listEditions });
    expect((await get(request("?from=2026-10-01&to=2026-10-03"))).status).toBe(401);
    expect((await get(request("?from=2026-10-01&to=2026-10-03", "wrong"))).status).toBe(401);
    expect(listEditions).not.toHaveBeenCalled();
  });
  it("exports full editions without caching and only reads", async () => {
    const listEditions = vi.fn().mockResolvedValue([edition]);
    const response = await createGetHandler({ secret: "correct", listEditions })(request("?from=2026-10-01&to=2026-10-03", "correct"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ from: "2026-10-01", to: "2026-10-03", editions: [edition] });
    expect(listEditions).toHaveBeenCalledExactlyOnceWith("2026-10-01", "2026-10-03");
  });
  it.each(["", "?from=2026-13-01&to=2026-10-03", "?from=2026-02-30&to=2026-10-03", "?from=2026-10-05&to=2026-10-01", "?from=2021-01-01&to=2026-10-03", "?from=2026-10-01"])("rejects invalid and excessive windows: %s", async (query) => {
    const listEditions = vi.fn();
    expect((await createGetHandler({ secret: "correct", listEditions })(request(query, "correct"))).status).toBe(400);
    expect(listEditions).not.toHaveBeenCalled();
  });
});
