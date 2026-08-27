import { describe, expect, it } from "vitest";

import type { ParsedEdition } from "@/features/fortune/domain";
import { InvalidEditionError, StaleSourceError } from "@/features/fortune/errors";
import { validateEdition } from "@/features/fortune/validate-edition";
import { makeParsedEdition } from "@/test/factories";

function invalidEdition(mutate: (edition: ParsedEdition) => void): ParsedEdition {
  const edition = makeParsedEdition({ source: "gogo", date: "2026-08-26" });
  mutate(edition);
  return edition;
}

describe("validateEdition", () => {
  it("accepts complete editions for both sources", () => {
    expect(() =>
      validateEdition(
        makeParsedEdition({ source: "ohaasa", date: "2026-08-26" }),
        "2026-08-26",
      ),
    ).not.toThrow();
    expect(() =>
      validateEdition(
        makeParsedEdition({ source: "gogo", date: "2026-08-26" }),
        "2026-08-26",
      ),
    ).not.toThrow();
  });

  it("rejects incomplete, duplicate-zodiac, and out-of-range editions", () => {
    const incomplete = invalidEdition((edition) => {
      edition.fortunes.pop();
    });
    expect(() => validateEdition(incomplete, "2026-08-26")).toThrow(/12/);

    const duplicate = invalidEdition((edition) => {
      edition.fortunes[1].zodiacCode = edition.fortunes[0].zodiacCode;
    });
    expect(() => validateEdition(duplicate, "2026-08-26")).toThrow(/zodiac/i);

    const outOfRange = invalidEdition((edition) => {
      edition.fortunes[0].rank = 13;
    });
    expect(() => validateEdition(outOfRange, "2026-08-26")).toThrow(/rank/i);
  });

  it("rejects duplicate and non-integer ranks", () => {
    const duplicate = invalidEdition((edition) => {
      edition.fortunes[1].rank = edition.fortunes[0].rank;
    });
    expect(() => validateEdition(duplicate, "2026-08-26")).toThrow(/rank/i);

    const fractional = invalidEdition((edition) => {
      edition.fortunes[0].rank = 1.5;
    });
    expect(() => validateEdition(fractional, "2026-08-26")).toThrow(/rank/i);
  });

  it("uses a stale error only for an edition date mismatch", () => {
    const stale = makeParsedEdition({ source: "gogo", date: "2026-08-25" });
    expect(() => validateEdition(stale, "2026-08-26")).toThrow(StaleSourceError);

    const invalid = invalidEdition((edition) => {
      edition.fortunes[0].comment = "";
    });
    expect(() => validateEdition(invalid, "2026-08-26")).toThrow(InvalidEditionError);
    expect(() => validateEdition(invalid, "2026-08-26")).not.toThrow(StaleSourceError);
  });

  it("rejects unknown sources and zodiac codes", () => {
    const unknownSource = makeParsedEdition({ source: "gogo", date: "2026-08-26" });
    (unknownSource as { source: string }).source = "invented";
    expect(() => validateEdition(unknownSource, "2026-08-26")).toThrow(/source/i);

    const unknownZodiac = invalidEdition((edition) => {
      (edition.fortunes[0] as { zodiacCode: string }).zodiacCode = "invented";
    });
    expect(() => validateEdition(unknownZodiac, "2026-08-26")).toThrow(/zodiac/i);
  });

  it("requires comments and source-specific lucky fields", () => {
    const missingComment = invalidEdition((edition) => {
      edition.fortunes[0].comment = "   ";
    });
    expect(() => validateEdition(missingComment, "2026-08-26")).toThrow(/comment/i);

    const missingOhaasaHint = makeParsedEdition({
      source: "ohaasa",
      date: "2026-08-26",
    });
    missingOhaasaHint.fortunes[0].luckyHint = null;
    expect(() => validateEdition(missingOhaasaHint, "2026-08-26")).toThrow(/lucky hint/i);

    const missingGogoColor = invalidEdition((edition) => {
      edition.fortunes[0].luckyColor = "";
    });
    expect(() => validateEdition(missingGogoColor, "2026-08-26")).toThrow(/lucky color/i);

    const missingGogoKey = invalidEdition((edition) => {
      edition.fortunes[0].luckyKey = null;
    });
    expect(() => validateEdition(missingGogoKey, "2026-08-26")).toThrow(/lucky key/i);
  });

  it("rejects unknown winner categories", () => {
    const edition = invalidEdition((candidate) => {
      (candidate.fortunes[0].winnerCategories as string[]).push("invented");
    });

    expect(() => validateEdition(edition, "2026-08-26")).toThrow(/category/i);
  });
});
