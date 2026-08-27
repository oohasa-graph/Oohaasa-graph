import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { InvalidEditionError, StaleSourceError } from "@/features/fortune/errors";
import { parseGogo } from "@/features/fortune/parsers/gogo";

const html = readFileSync("src/test/fixtures/gogo-valid.html", "utf8");

describe("parseGogo", () => {
  it("parses date, ranks, fortune details, scoped scores, and winner categories", () => {
    const edition = parseGogo(html, "2026-08-26");

    expect(edition).toMatchObject({
      source: "gogo",
      editionDate: "2026-08-26",
      sourceDateLabel: "8月26日（Wed）",
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
    expect(edition.fortunes.find((item) => item.zodiacCode === "libra")).toEqual({
      zodiacCode: "libra",
      rank: 1,
      comment: "協力すると良い流れを作れる日。",
      adviceLines: ["協力すると良い流れを作れる日。"],
      luckyHint: null,
      luckyColor: "青",
      luckyKey: "小さな手帳",
      scores: { money: 4, love: 5, work: 4, health: 3 },
      winnerCategories: ["overall", "love"],
    });
  });

  it("leaves an omitted score category neutral", () => {
    const signStart = html.indexOf('<article id="tenbin">');
    const luckyStart = html.indexOf('<div class="lucky-box">', signStart);
    const moneyStart = html.indexOf('<div class="money">', luckyStart);
    const moneyEnd = html.indexOf("</div>", moneyStart) + "</div>".length;
    const withoutMoneyScore = html.slice(0, moneyStart) + html.slice(moneyEnd);

    const edition = parseGogo(withoutMoneyScore, "2026-08-26");

    expect(edition.fortunes.find((item) => item.zodiacCode === "libra")?.scores).toEqual({
      money: null,
      love: 5,
      work: 4,
      health: 3,
    });
  });

  it("preserves the parsed source date when rejecting stale content", () => {
    let thrown: unknown;

    try {
      parseGogo(html, "2026-08-27");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(StaleSourceError);
    expect(thrown).toMatchObject({
      code: "SOURCE_STALE",
      sourceDate: "2026-08-26",
      message: "Source date is stale",
    });
  });

  it("rejects a source weekday that does not match its calendar date", () => {
    const parse = () => parseGogo(html.replace("Wed", "Thu"), "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow(/weekday/i);
  });

  it("fails closed on malformed ranking structure with a sanitized typed error", () => {
    const sourceProse = "Invented source prose that must stay private";
    const malformed = html
      .replace('class="rank-box"', 'class="broken-rank-box"')
      .replace("軽い運動で気分を整えられる日。", sourceProse);
    const parse = () => parseGogo(malformed, "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow("Gogo ranking structure is invalid");
    expect(parse).not.toThrow(sourceProse);
  });

  it("rejects duplicate normalized zodiac signs", () => {
    const malformed = html.replace('data-label="ousi"', 'data-label="tenbin"');
    const parse = () => parseGogo(malformed, "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow("Gogo signs and ranks must be unique");
    expect(parse).not.toThrow(/tenbin/);
  });

  it("rejects duplicate ranks", () => {
    const malformed = html.replace("rank-2.png", "rank-1.png");
    const parse = () => parseGogo(malformed, "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow("Gogo signs and ranks must be unique");
    expect(parse).not.toThrow(/rank-1/);
  });

  it("rejects unknown winner category tokens", () => {
    const malformed = html.replace(
      'class="number-one-area love"',
      'class="number-one-area love mystery"',
    );
    const parse = () => parseGogo(malformed, "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow("Gogo winner marker is invalid");
    expect(parse).not.toThrow(/mystery/);
  });

  it("rejects missing lucky fields without exposing fortune prose", () => {
    const sourceProse = "Invented hidden detail";
    const malformed = html
      .replace("協力すると良い流れを作れる日。", sourceProse)
      .replace('<span class="key-txt">幸運のカギ</span>：小さな手帳', "");
    const parse = () => parseGogo(malformed, "2026-08-26");

    expect(parse).toThrow(InvalidEditionError);
    expect(parse).toThrow(/lucky key/i);
    expect(parse).not.toThrow(sourceProse);
  });
});
