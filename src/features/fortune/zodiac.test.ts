import { describe, expect, it } from "vitest";
import {
  zodiacFromGogoId,
  zodiacFromOhaasaCode,
} from "@/features/fortune/zodiac";
import { InvalidEditionError } from "@/features/fortune/errors";

describe("source zodiac mappings", () => {
  it("maps a known Ohaasa code and rejects an unknown code", () => {
    expect(zodiacFromOhaasaCode("01")).toBe("aries");
    expect(() => zodiacFromOhaasaCode("99")).toThrow(InvalidEditionError);
  });

  it("maps a known Gogo id and rejects an unknown id", () => {
    expect(zodiacFromGogoId("tenbin")).toBe("libra");
    expect(() => zodiacFromGogoId("unknown")).toThrow(InvalidEditionError);
  });
});
