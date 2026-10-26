import { load } from "cheerio";

import type {
  FortuneScores,
  ParsedEdition,
  ParsedFortune,
  WinnerCategory,
  ZodiacCode,
} from "@/features/fortune/domain";
import { InvalidEditionError, StaleSourceError } from "@/features/fortune/errors";
import {
  GOGO_ZODIAC_BY_ID,
  zodiacFromGogoId,
} from "@/features/fortune/zodiac";

const DATE_RE = /(\d{1,2})月(\d{1,2})日（(Sun|Mon|Tue|Wed|Thu|Fri|Sat)）/;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_SOURCE_DATE_DISTANCE_MS = 183 * 24 * 60 * 60 * 1_000;
const WINNER_BY_CLASS: Readonly<Record<string, WinnerCategory>> = Object.freeze({
  overall: "overall",
  total: "overall",
  money: "money",
  love: "love",
  work: "work",
  health: "health",
});

function invalid(message: string): never {
  throw new InvalidEditionError(message);
}

function sourceDateFromTitle(
  title: string,
  expectedDate: string,
): { editionDate: string; sourceDateLabel: string } {
  const match = title.match(DATE_RE);
  const expectedMatch = expectedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !expectedMatch) {
    return invalid("Gogo source date is invalid");
  }

  const expectedYear = Number(expectedMatch[1]);
  const expectedMonth = Number(expectedMatch[2]);
  const expectedDay = Number(expectedMatch[3]);
  const targetDate = new Date(Date.UTC(expectedYear, expectedMonth - 1, expectedDay));
  if (
    targetDate.getUTCFullYear() !== expectedYear ||
    targetDate.getUTCMonth() !== expectedMonth - 1 ||
    targetDate.getUTCDate() !== expectedDay
  ) {
    return invalid("Gogo source date is invalid");
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const weekday = match[3];
  const validCandidates = [expectedYear - 1, expectedYear, expectedYear + 1]
    .map((year) => new Date(Date.UTC(year, month - 1, day)))
    .filter(
      (date) =>
        date.getUTCMonth() === month - 1 && date.getUTCDate() === day,
    );
  if (validCandidates.length === 0) {
    return invalid("Gogo source date is invalid");
  }

  const weekdayCandidates = validCandidates.filter(
    (date) =>
      WEEKDAYS[date.getUTCDay()] === weekday &&
      Math.abs(date.getTime() - targetDate.getTime()) <= MAX_SOURCE_DATE_DISTANCE_MS,
  );
  if (weekdayCandidates.length === 0) {
    return invalid("Gogo source weekday is invalid");
  }
  const sourceDate = weekdayCandidates.reduce((nearest, candidate) =>
    Math.abs(candidate.getTime() - targetDate.getTime()) <
    Math.abs(nearest.getTime() - targetDate.getTime())
      ? candidate
      : nearest,
  );

  return {
    editionDate: sourceDate.toISOString().slice(0, 10),
    sourceDateLabel: match[0],
  };
}

export function parseGogo(html: string, expectedDate: string): ParsedEdition {
  let $: ReturnType<typeof load>;
  try {
    $ = load(html);
  } catch {
    return invalid("Gogo HTML is invalid");
  }

  const titleDates = new Set(
    $(".ttl-area")
      .toArray()
      .map((area) => $(area).text().match(DATE_RE)?.[0])
      .filter((date): date is string => date !== undefined),
  );
  if (titleDates.size !== 1) {
    return invalid("Gogo source date structure is invalid");
  }
  const { editionDate, sourceDateLabel } = sourceDateFromTitle(
    [...titleDates][0],
    expectedDate,
  );
  if (editionDate !== expectedDate) {
    throw new StaleSourceError(editionDate);
  }

  const rankingLinks = $(".rank-box a[data-label]");
  if (rankingLinks.length !== 12) {
    return invalid("Gogo ranking structure is invalid");
  }

  const rankings: Array<{ zodiacCode: ZodiacCode; rank: number }> = [];
  rankingLinks.each((_, element) => {
    const sourceId = $(element).attr("data-label")?.trim();
    if (!sourceId) {
      return invalid("Gogo ranking structure is invalid");
    }

    const matchingRankSources = $(element)
      .find("img")
      .toArray()
      .map((image) => $(image).attr("src") ?? "")
      .map((source) => source.match(/(?:^|\/)rank-(\d+)\.png(?:[?#].*)?$/))
      .filter((match): match is RegExpMatchArray => match !== null);
    if (matchingRankSources.length !== 1) {
      return invalid("Gogo rank is invalid");
    }

    const rank = Number(matchingRankSources[0][1]);
    if (!Number.isInteger(rank) || rank < 1 || rank > 12) {
      return invalid("Gogo rank is invalid");
    }
    rankings.push({ zodiacCode: zodiacFromGogoId(sourceId), rank });
  });

  const uniqueRankingSigns = new Set(rankings.map((item) => item.zodiacCode));
  const uniqueRankingRanks = new Set(rankings.map((item) => item.rank));
  if (uniqueRankingSigns.size !== 12 || uniqueRankingRanks.size !== 12) {
    return invalid("Gogo signs and ranks must be unique");
  }
  const rankBySign = new Map(
    rankings.map((item) => [item.zodiacCode, item.rank] as const),
  );

  const fortunes: ParsedFortune[] = Object.keys(GOGO_ZODIAC_BY_ID).map(
    (sourceId) => {
      const zodiacCode = zodiacFromGogoId(sourceId);
      const details = $(`#${sourceId}`);
      const rank = rankBySign.get(zodiacCode);
      if (details.length !== 1 || rank === undefined) {
        return invalid("Gogo sign structure is invalid");
      }

      const comments = details.find(".read");
      const comment = comments.text().trim();
      if (comments.length !== 1 || comment.length === 0) {
        return invalid("Gogo comment is invalid");
      }

      const luckyBoxes = details.find(".lucky-box");
      const luckyValue = (
        selector: string,
        label: string,
        errorMessage: string,
      ): string => {
        const labels = details.find(selector);
        if (labels.length !== 1 || labels.text().trim() !== label) {
          return invalid(errorMessage);
        }

        // The value is the bare text right after the label, up to the next element.
        let text = "";
        for (let node = labels.get(0)?.nextSibling; node?.type === "text"; node = node.nextSibling) {
          text += $(node).text();
        }
        const valueMatch = text.trim().match(/^[：:]\s*([\s\S]+)$/);
        if (!valueMatch || valueMatch[1].trim().length === 0) {
          return invalid(errorMessage);
        }
        return valueMatch[1].trim();
      };

      let luckyColor: string | null;
      let luckyKey: string | null;
      let scores: FortuneScores;
      if (luckyBoxes.length === 1) {
        const luckyBox = luckyBoxes.first();
        luckyColor = luckyValue(".color-txt", "ラッキーカラー", "Gogo lucky color is invalid");
        luckyKey = luckyValue(".key-txt", "幸運のカギ", "Gogo lucky key is invalid");
        const scoreFor = (category: keyof FortuneScores): number | null => {
          const containers = luckyBox.children(`.${category}`);
          if (containers.length === 0) return null;
          if (containers.length > 1) return invalid("Gogo score structure is invalid");
          const score = containers.find("img").length;
          if (score < 1 || score > 5) return invalid("Gogo score is invalid");
          return score;
        };
        scores = {
          money: scoreFor("money"), love: scoreFor("love"),
          work: scoreFor("work"), health: scoreFor("health"),
        };
      } else if (luckyBoxes.length === 4) {
        luckyColor = luckyValue(".lucky-color-txt", "ラッキーカラー", "Gogo lucky color is invalid");
        luckyKey = luckyValue(".key-txt", "幸運のカギ", "Gogo lucky key is invalid");
        const scoreFor = (category: keyof FortuneScores): number => {
          const boxes = luckyBoxes.filter((_, box) =>
            $(box).children(`.icon-${category}`).length > 0,
          );
          if (boxes.length !== 1) return invalid("Gogo score structure is invalid");
          const icons = boxes.first().children();
          if (icons.length < 1 || icons.length > 5 ||
              icons.filter(`.icon-${category}`).length !== icons.length) {
            return invalid("Gogo score is invalid");
          }
          return icons.length;
        };
        scores = {
          money: scoreFor("money"), love: scoreFor("love"),
          work: scoreFor("work"), health: scoreFor("health"),
        };
      } else {
        return invalid("Gogo lucky structure is invalid");
      }

      const winnerCategories: WinnerCategory[] = [];
      details.find(".number-one-area").each((_, marker) => {
        const classNames = (node: Parameters<typeof $>[0]) =>
          ($(node).attr("class") ?? "").split(/\s+/).filter(Boolean);
        // Legacy markers carry the category class; current ones list li.number-one-<category>.
        const tokens = [
          ...classNames(marker).filter((className) => className !== "number-one-area"),
          ...$(marker)
            .find("li")
            .toArray()
            .flatMap(classNames)
            .filter((className) => className.startsWith("number-one-"))
            .map((className) => className.slice("number-one-".length)),
        ];
        if (
          tokens.length === 0 ||
          tokens.some((token) => !Object.hasOwn(WINNER_BY_CLASS, token))
        ) {
          return invalid("Gogo winner marker is invalid");
        }
        const categories = tokens.map((token) => WINNER_BY_CLASS[token]);
        for (const category of categories) {
          if (!winnerCategories.includes(category)) {
            winnerCategories.push(category);
          }
        }
      });

      return {
        zodiacCode,
        rank,
        comment,
        adviceLines: [comment],
        luckyHint: null,
        luckyColor,
        luckyKey,
        scores,
        winnerCategories,
      };
    },
  );

  const uniqueSigns = new Set(fortunes.map((fortune) => fortune.zodiacCode));
  const uniqueRanks = new Set(fortunes.map((fortune) => fortune.rank));
  if (fortunes.length !== 12 || uniqueSigns.size !== 12 || uniqueRanks.size !== 12) {
    return invalid("Gogo signs and ranks must be unique");
  }

  return {
    source: "gogo",
    editionDate,
    sourceDateLabel,
    attribution: null,
    fortunes,
  };
}
