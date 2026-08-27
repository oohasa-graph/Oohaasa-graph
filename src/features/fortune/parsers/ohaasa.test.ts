import { describe, expect, it } from "vitest";

import { InvalidEditionError, StaleSourceError } from "@/features/fortune/errors";
import { parseOhaasa } from "@/features/fortune/parsers/ohaasa";
import fixture from "@/test/fixtures/ohaasa-valid.json";

describe("parseOhaasa", () => {
  it("normalizes twelve ranks, advice lines, and neutral lucky hints", () => {
    const edition = parseOhaasa(fixture, "2026-08-26");

    expect(edition).toMatchObject({
      source: "ohaasa",
      editionDate: "2026-08-26",
      sourceDateLabel: "20260826",
      attribution: null,
    });
    expect(edition.fortunes).toHaveLength(12);
    expect(edition.fortunes.map((item) => item.zodiacCode)).toEqual([
      "aries",
      "taurus",
      "gemini",
      "cancer",
      "leo",
      "virgo",
      "libra",
      "scorpio",
      "sagittarius",
      "capricorn",
      "aquarius",
      "pisces",
    ]);
    expect(edition.fortunes.map((item) => item.rank).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(edition.fortunes.find((item) => item.zodiacCode === "aries")).toEqual({
      zodiacCode: "aries",
      rank: 4,
      comment: "新しい一歩を楽しめそう\n深呼吸して進もう",
      adviceLines: ["新しい一歩を楽しめそう", "深呼吸して進もう"],
      luckyHint: "青いノート",
      luckyColor: null,
      luckyKey: null,
      scores: { money: null, love: null, work: null, health: null },
      winnerCategories: [],
    });
  });

  it("rejects stale dates and malformed lucky boundaries with typed errors", () => {
    const stale = () => parseOhaasa(fixture, "2026-08-27");

    expect(stale).toThrow(StaleSourceError);
    expect(stale).toThrow(/stale/i);

    const malformed = structuredClone(fixture);
    malformed[0].detail[0].horoscope_text =
      "Invented advice without a lucky delimiter";
    const invalid = () => parseOhaasa(malformed, "2026-08-26");

    expect(invalid).toThrow(InvalidEditionError);
    expect(invalid).toThrow(/lucky/i);
    expect(invalid).not.toThrow(/Invented advice/);
  });

  it("fails closed on malformed source shape without exposing source values", () => {
    const malformed = structuredClone(fixture) as unknown[];
    malformed.push({ source_prose: "Do not expose this source value" });
    const parse = () => parseOhaasa(malformed, "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow("Ohaasa edition shape is invalid");
    expect(parse).not.toThrow(/Do not expose this source value/);
  });

  it("rejects duplicate zodiac signs as a sanitized invalid edition", () => {
    const malformed = structuredClone(fixture);
    malformed[0].detail[1].horoscope_st = malformed[0].detail[0].horoscope_st;
    const parse = () => parseOhaasa(malformed, "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow("Ohaasa signs and ranks must be unique");
    expect(parse).not.toThrow(/01/);
  });

  it("rejects duplicate ranks as a sanitized invalid edition", () => {
    const malformed = structuredClone(fixture);
    malformed[0].detail[1].ranking_no = malformed[0].detail[0].ranking_no;
    const parse = () => parseOhaasa(malformed, "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow("Ohaasa signs and ranks must be unique");
    expect(parse).not.toThrow(/rank 4/i);
  });

  it("rejects impossible source dates as sanitized invalid editions", () => {
    const malformed = structuredClone(fixture);
    malformed[0].onair_date = "20260230";
    const parse = () => parseOhaasa(malformed, "2026-02-30");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow("Ohaasa source date is invalid");
    expect(parse).not.toThrow("20260230");
  });
});
