import type { Source } from "@/features/fortune/domain";
import { StaleSourceError } from "@/features/fortune/errors";
import { parseGogo } from "@/features/fortune/parsers/gogo";
import { parseOhaasa } from "@/features/fortune/parsers/ohaasa";
import { getJstDate } from "@/lib/time/jst";

export function parseSnapshotUrl(url: string): { timestamp: string; capturedJstDate: string; originalUrl: string } | null {
  const match = /^https:\/\/web\.archive\.org\/web\/(\d{14})id_\/(https:\/\/[^\s]+)$/.exec(url);
  if (!match) return null;
  const timestamp = match[1];
  const iso = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}Z`;
  const captured = new Date(iso);
  if (!Number.isFinite(captured.getTime()) || captured.toISOString().slice(0, 19) !== iso.slice(0, 19)) return null;
  return { timestamp, capturedJstDate: getJstDate(captured), originalUrl: match[2] };
}

export function deriveEditionDate(source: Source, body: unknown, capturedJstDate: string): string | null {
  try {
    if (source === "ohaasa") parseOhaasa(body, capturedJstDate);
    else if (typeof body === "string") parseGogo(body, capturedJstDate);
    else return null;
    return capturedJstDate;
  } catch (error) {
    return error instanceof StaleSourceError ? error.sourceDate : null;
  }
}
