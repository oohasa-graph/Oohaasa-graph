import { describe, expect, it } from "vitest";
import { marketQuery, parseMarketParams, searchToParams } from "@/features/market/market-params";

describe("market URL state", () => {
  it("keeps valid sign, source, and range", () => {
    expect(parseMarketParams({ sign: "leo", source: "gogo", range: "all" })).toEqual({ sign: "leo", source: "gogo", range: "all" });
  });

  it("falls back to libra, Ohaasa, and one month for missing or unknown values", () => {
    expect(parseMarketParams({ sign: "x", source: "y", range: "10y" })).toEqual({ sign: "libra", source: "ohaasa", range: "1m" });
    expect(parseMarketParams({})).toEqual({ sign: "libra", source: "ohaasa", range: "1m" });
    expect(parseMarketParams({ sign: "__proto__", source: "toString", range: "" })).toEqual({ sign: "libra", source: "ohaasa", range: "1m" });
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parseMarketParams({ sign: ["leo", "aries"] }).sign).toBe("leo");
    expect(parseMarketParams({ sign: ["x", "leo"], range: ["3m", "1w"] })).toMatchObject({ sign: "libra", range: "3m" });
    expect(parseMarketParams({ sign: [] }).sign).toBe("libra");
  });

  it("builds the shared query string", () => {
    expect(marketQuery({ sign: "leo", source: "gogo", range: "3m" })).toBe("?sign=leo&source=gogo&range=3m");
  });

  it("reads a browser search string the way Next passes searchParams", () => {
    expect(searchToParams("?sign=leo&sign=aries&range=3m")).toEqual({ sign: ["leo", "aries"], range: "3m" });
    expect(parseMarketParams(searchToParams("?sign=leo&sign=aries"))).toMatchObject({ sign: "leo" });
    expect(searchToParams("")).toEqual({});
  });
});
