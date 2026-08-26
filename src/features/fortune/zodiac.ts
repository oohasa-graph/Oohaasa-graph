import { InvalidEditionError } from "@/features/fortune/errors";
import type { ZodiacCode } from "@/features/fortune/domain";

export const OHAASA_ZODIAC_BY_CODE: Readonly<Record<string, ZodiacCode>> = Object.freeze({
  "01": "aries",
  "02": "taurus",
  "03": "gemini",
  "04": "cancer",
  "05": "leo",
  "06": "virgo",
  "07": "libra",
  "08": "scorpio",
  "09": "sagittarius",
  "10": "capricorn",
  "11": "aquarius",
  "12": "pisces",
});

export const GOGO_ZODIAC_BY_ID: Readonly<Record<string, ZodiacCode>> = Object.freeze({
  ohitsuji: "aries",
  ousi: "taurus",
  futago: "gemini",
  kani: "cancer",
  sisi: "leo",
  otome: "virgo",
  tenbin: "libra",
  sasori: "scorpio",
  ite: "sagittarius",
  yagi: "capricorn",
  mizugame: "aquarius",
  uo: "pisces",
});

export function zodiacFromOhaasaCode(value: string): ZodiacCode {
  const zodiac = OHAASA_ZODIAC_BY_CODE[value];
  if (!zodiac) {
    throw new InvalidEditionError("Unknown Ohaasa zodiac code");
  }
  return zodiac;
}

export function zodiacFromGogoId(value: string): ZodiacCode {
  const zodiac = GOGO_ZODIAC_BY_ID[value];
  if (!zodiac) {
    throw new InvalidEditionError("Unknown Gogo zodiac id");
  }
  return zodiac;
}
