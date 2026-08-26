import { describe, expect, it } from "vitest";
import { getJstDate } from "@/lib/time/jst";

describe("getJstDate", () => {
  it("crosses into the next date at Japan midnight", () => {
    expect(getJstDate(new Date("2026-08-25T15:00:00Z"))).toBe("2026-08-26");
  });
});
