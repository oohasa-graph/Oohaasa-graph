import {
  SOURCES,
  ZODIAC_CODES,
  type ParsedEdition,
  type WinnerCategory,
} from "@/features/fortune/domain";
import { InvalidEditionError, StaleSourceError } from "@/features/fortune/errors";

const RANKS = new Set(Array.from({ length: 12 }, (_, index) => index + 1));
const ZODIACS = new Set<string>(ZODIAC_CODES);
const WINNER_CATEGORIES = new Set<WinnerCategory>([
  "overall",
  "money",
  "love",
  "work",
  "health",
]);

function isNonempty(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateEdition(
  edition: ParsedEdition,
  expectedDate: string,
): void {
  if (edition.editionDate !== expectedDate) {
    throw new StaleSourceError(edition.editionDate);
  }

  if (!SOURCES.includes(edition.source)) {
    throw new InvalidEditionError("Edition source is invalid");
  }

  if (edition.fortunes.length !== 12) {
    throw new InvalidEditionError("Edition must contain exactly 12 fortunes");
  }

  const zodiacCodes = edition.fortunes.map((fortune) => fortune.zodiacCode);
  if (
    new Set(zodiacCodes).size !== ZODIAC_CODES.length ||
    zodiacCodes.some((zodiacCode) => !ZODIACS.has(zodiacCode))
  ) {
    throw new InvalidEditionError("Edition zodiac set is invalid");
  }

  const ranks = edition.fortunes.map((fortune) => fortune.rank);
  if (
    new Set(ranks).size !== RANKS.size ||
    ranks.some((rank) => !Number.isInteger(rank) || !RANKS.has(rank))
  ) {
    throw new InvalidEditionError("Edition rank set is invalid");
  }

  for (const fortune of edition.fortunes) {
    if (!isNonempty(fortune.comment)) {
      throw new InvalidEditionError("Edition comment is required");
    }

    if (edition.source === "ohaasa" && !isNonempty(fortune.luckyHint)) {
      throw new InvalidEditionError("Ohaasa lucky hint is required");
    }

    if (edition.source === "gogo" && !isNonempty(fortune.luckyColor)) {
      throw new InvalidEditionError("Gogo lucky color is required");
    }

    if (edition.source === "gogo" && !isNonempty(fortune.luckyKey)) {
      throw new InvalidEditionError("Gogo lucky key is required");
    }

    if (
      !Array.isArray(fortune.winnerCategories) ||
      fortune.winnerCategories.some(
        (category) => !WINNER_CATEGORIES.has(category),
      )
    ) {
      throw new InvalidEditionError("Edition winner category is invalid");
    }
  }
}
