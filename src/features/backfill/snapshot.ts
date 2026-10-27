import { EARLIEST_EDITION_DATE, type Source } from "@/features/fortune/domain";
import { StaleSourceError } from "@/features/fortune/errors";
import { parseGogo } from "@/features/fortune/parsers/gogo";
import { parseOhaasa } from "@/features/fortune/parsers/ohaasa";
import { getJstDate } from "@/lib/time/jst";

// Bounds keep a forged snapshot from planting editions far outside real history.
const MAX_DAYS_BEFORE_CAPTURE = 31;
const MAX_DAYS_AFTER_CAPTURE = 1;

function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

export function parseSnapshotUrl(url: string): { timestamp: string; capturedJstDate: string; originalUrl: string } | null {
  const match = /^https:\/\/web\.archive\.org\/web\/(\d{14})id_\/(https:\/\/[^\s]+)$/.exec(url);
  if (!match) return null;
  const timestamp = match[1];
  const iso = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}Z`;
  const captured = new Date(iso);
  if (!Number.isFinite(captured.getTime()) || captured.toISOString().slice(0, 19) !== iso.slice(0, 19)) return null;
  const capturedJstDate = getJstDate(captured);
  if (capturedJstDate < EARLIEST_EDITION_DATE) return null;
  return { timestamp, capturedJstDate, originalUrl: match[2] };
}

export function deriveEditionDate(source: Source, body: unknown, capturedJstDate: string): string | null {
  let editionDate: string;
  try {
    if (source === "ohaasa") parseOhaasa(body, capturedJstDate);
    else if (typeof body === "string") parseGogo(body, capturedJstDate);
    else return null;
    editionDate = capturedJstDate;
  } catch (error) {
    if (!(error instanceof StaleSourceError)) return null;
    editionDate = error.sourceDate;
  }
  const offset = daysBetween(capturedJstDate, editionDate);
  return offset >= -MAX_DAYS_BEFORE_CAPTURE && offset <= MAX_DAYS_AFTER_CAPTURE && editionDate >= EARLIEST_EDITION_DATE
    ? editionDate : null;
}
