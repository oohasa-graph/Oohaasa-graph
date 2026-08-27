import { describe, expect, it } from "vitest";

import { isAuthorized } from "@/features/ingestion/request-auth";

function requestWithBearer(secret: string) {
  return new Request("http://test/api/internal/ingest", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ attempt: "primary", source: "gogo", force: false }),
  });
}

describe("isAuthorized", () => {
  it("rejects missing and incorrect bearer secrets", () => {
    expect(isAuthorized(new Request("http://test"), "correct-secret")).toBe(false);
    expect(isAuthorized(requestWithBearer("wrong-secret"), "correct-secret")).toBe(false);
    expect(isAuthorized(requestWithBearer("correct-secret"), "correct-secret")).toBe(true);
  });

  it("rejects malformed headers, empty secrets, and length mismatches", () => {
    expect(
      isAuthorized(
        new Request("http://test", { headers: { authorization: "Basic correct-secret" } }),
        "correct-secret",
      ),
    ).toBe(false);
    expect(isAuthorized(requestWithBearer("correct-secret"), "")).toBe(false);
    expect(isAuthorized(requestWithBearer("short"), "correct-secret")).toBe(false);
  });
});
