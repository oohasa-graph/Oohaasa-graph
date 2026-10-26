import type { Source } from "../fortune/domain";
import { SOURCE_URLS } from "../fortune/source-urls";

export function cdxQueryUrl(source: Source, from: string, to: string): string {
  return `https://web.archive.org/cdx/search/cdx?url=${SOURCE_URLS[source].replace(/^https:\/\//, "")}&output=json&fl=timestamp&filter=statuscode:200&from=${from.replaceAll("-", "")}&to=${to.replaceAll("-", "")}`;
}

export function parseCdxTimestamps(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return [...new Set(json.slice(1).flatMap((row) =>
    Array.isArray(row) && typeof row[0] === "string" && /^\d{14}$/.test(row[0]) ? [row[0]] : [],
  ))].sort();
}

export function snapshotRawUrl(source: Source, timestamp: string): string {
  return `https://web.archive.org/web/${timestamp}id_/${SOURCE_URLS[source]}`;
}

export function describeResult(source: Source, timestamp: string, result: { status: string; targetDate: string }): string {
  return `${source} ${timestamp} -> ${result.status} ${result.targetDate}`;
}
