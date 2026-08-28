import { z } from "zod";

import type { ParsedEdition, ParsedFortune } from "@/features/fortune/domain";
import { InvalidEditionError, StaleSourceError } from "@/features/fortune/errors";
import { zodiacFromOhaasaCode } from "@/features/fortune/zodiac";

const ohaasaDetailSchema = z.object({
  ranking_no: z.number().int().min(1).max(12),
  horoscope_st: z.string().regex(/^\d{2}$/),
  horoscope_text: z.string().min(1),
});

const ohaasaPayloadSchema = z
  .array(
    z.object({
      onair_date: z.string().regex(/^\d{8}$/),
      detail: z.array(ohaasaDetailSchema).length(12),
    }),
  )
  .length(1);

function parseSourceDate(raw: string): string {
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new InvalidEditionError("Ohaasa source date is invalid");
  }

  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function parseHoroscopeText(raw: string) {
  const boundary = raw.match(/\t{2,}/);
  if (!boundary || boundary.index === undefined) {
    throw new Error("Ohaasa lucky hint boundary is missing");
  }
  const adviceLines = raw
    .slice(0, boundary.index)
    .split(/\t+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const luckyHint = raw.slice(boundary.index + boundary[0].length).trim();
  if (adviceLines.length === 0 || luckyHint.length === 0) {
    throw new Error("Ohaasa advice or lucky hint is empty");
  }
  return { adviceLines, luckyHint };
}

export function parseOhaasa(payload: unknown, expectedDate: string): ParsedEdition {
  const result = ohaasaPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new InvalidEditionError("Ohaasa edition shape is invalid");
  }

  const sourceEdition = result.data[0];
  const editionDate = parseSourceDate(sourceEdition.onair_date);
  if (editionDate !== expectedDate) {
    throw new StaleSourceError(editionDate);
  }

  const fortunes: ParsedFortune[] = sourceEdition.detail.map((detail) => {
    let parsedText: ReturnType<typeof parseHoroscopeText>;
    try {
      parsedText = parseHoroscopeText(detail.horoscope_text);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "Ohaasa lucky hint boundary is missing" ||
          error.message === "Ohaasa advice or lucky hint is empty")
      ) {
        throw new InvalidEditionError(error.message);
      }
      throw new InvalidEditionError("Ohaasa fortune text is invalid");
    }

    return {
      zodiacCode: zodiacFromOhaasaCode(detail.horoscope_st),
      rank: detail.ranking_no,
      comment: parsedText.adviceLines.join("\n"),
      adviceLines: parsedText.adviceLines,
      luckyHint: parsedText.luckyHint,
      luckyColor: null,
      luckyKey: null,
      scores: { money: null, love: null, work: null, health: null },
      winnerCategories: [],
    };
  });

  const uniqueSigns = new Set(fortunes.map((fortune) => fortune.zodiacCode));
  const uniqueRanks = new Set(fortunes.map((fortune) => fortune.rank));
  if (uniqueSigns.size !== 12 || uniqueRanks.size !== 12) {
    throw new InvalidEditionError("Ohaasa signs and ranks must be unique");
  }

  return {
    source: "ohaasa",
    editionDate,
    sourceDateLabel: sourceEdition.onair_date,
    attribution: null,
    fortunes,
  };
}
