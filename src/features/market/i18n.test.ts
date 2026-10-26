import { describe, expect, it } from "vitest";
import { ZODIAC_CODES } from "@/features/fortune/domain";
import {
  DEFAULT_LANGUAGE, LANGUAGES, flavor, formatRank, messages, moodLine, rangeLabel, sourceName,
} from "@/features/market/i18n";
import { SIGN_META, lineColor, pastelColor, signName } from "@/features/market/signs";
import { MARKET_RANGES } from "@/features/market/types";

const sample = (value: unknown): unknown => typeof value === "function" ? value(3, 5) : value;

describe("market copy", () => {
  it("defines every Japanese key in English and Korean with non-empty text", () => {
    expect(DEFAULT_LANGUAGE).toBe("ja");
    for (const key of Object.keys(messages.ja) as (keyof typeof messages.ja)[]) {
      for (const lang of LANGUAGES) {
        const value = sample(messages[lang][key]);
        if (Array.isArray(value)) expect(value).toHaveLength(6);
        else expect(String(value).trim(), `${lang}.${key}`).not.toBe("");
      }
    }
    expect(messages.ja.coverage(18, 21)).toBe("18/21朝");
    expect(messages.en.stale("2026-10-25")).toBe("Data from 2026-10-25 JST");
    expect(messages.ko.streakDays(3)).toBe("3일 연속 ✦");
    expect(messages.en.times(2)).toBe("2×");
  });

  it("formats ranks, sources, ranges, flavor labels, and mood lines per language", () => {
    expect(formatRank("en", 3)).toBe("#3");
    expect(formatRank("ja", 3)).toBe("3位");
    expect(formatRank("ko", 3)).toBe("3위");
    expect(sourceName("ja", "ohaasa")).toBe("おはあさ");
    expect(sourceName("ko", "gogo")).toBe("고고");
    expect(MARKET_RANGES.map((range) => rangeLabel("ja", range))).toEqual(["1週", "1か月", "3か月", "ぜんぶ"]);
    expect(rangeLabel("en", "all")).toBe("ALL");
    expect(flavor("ja", "watch")).toBe("TODAY'S BOARD");
    expect(flavor("en", "watch")).toBe("今日の銘柄");
    expect(flavor("ko", "watch")).toBe("今日の銘柄");
    expect(moodLine("ja", 0)).toBe("1位だよ！やったー ✦");
    expect(moodLine("ko", 5)).toBe("내일은 꼭 오를 거야…!");
  });

  it("names every sign with original metadata in each language", () => {
    expect(ZODIAC_CODES.map((code) => signName("ko", code))).toEqual([
      "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리",
      "천칭자리", "전갈자리", "궁수자리", "염소자리", "물병자리", "물고기자리",
    ]);
    expect(signName("ja", "leo")).toBe("しし座");
    expect(signName("en", "sagittarius")).toBe("Sagittarius");
    expect(ZODIAC_CODES.map((code) => SIGN_META[code].ticker).join(" "))
      .toBe("ARI TAU GEM CAN LEO VIR LIB SCO SAG CAP AQU PIS");
    expect(SIGN_META.aries.glyph).toBe("♈︎");
    expect(SIGN_META.pisces.hue).toBe(330);
    expect(lineColor("libra")).toBe("hsl(180 70% 64%)");
    expect(pastelColor("libra")).toBe("hsl(180 92% 87%)");
  });
});
