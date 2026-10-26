import { parseArgs } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { SOURCES } from "../src/features/fortune/domain";
import { cdxQueryUrl, describeResult, parseCdxTimestamps, snapshotRawUrl } from "../src/features/backfill/wayback";

const resultSchema = z.object({
  status: z.enum(["success", "already_complete", "not_expected", "stale", "invalid", "fetch_error"]),
  targetDate: z.iso.date(),
});

async function main() {
  const { values } = parseArgs({ options: { source: { type: "string", default: "all" }, from: { type: "string" }, to: { type: "string" } } });
  const sourceInput = z.enum(["all", ...SOURCES]).parse(values.source);
  const from = z.iso.date().parse(values.from);
  const to = z.iso.date().parse(values.to);
  if (from > to) throw new Error("Invalid date range");
  const endpoint = z.url().parse(process.env.INGEST_URL);
  const secret = z.string().min(1).parse(process.env.INGEST_SECRET);
  const sources = sourceInput === "all" ? SOURCES : [sourceInput];
  const totals: Record<string, number> = {};
  const count = (status: string) => { totals[status] = (totals[status] ?? 0) + 1; };
  let lastWaybackRequest = 0;
  async function waybackFetch(url: string) {
    await sleep(Math.max(0, 1000 - (Date.now() - lastWaybackRequest)));
    lastWaybackRequest = Date.now();
    return fetch(url, { headers: { "User-Agent": "Oohaasa-graph/1.0 (github.com/oohasa-graph)" }, signal: AbortSignal.timeout(60_000) });
  }
  for (const source of sources) {
    let timestamps: string[];
    try {
      const cdx = await waybackFetch(cdxQueryUrl(source, from, to));
      if (!cdx.ok) { count("wayback_error"); continue; }
      timestamps = parseCdxTimestamps(await cdx.json());
    } catch { count("wayback_error"); continue; }
    console.log(`${source} captures=${timestamps.length}`);
    for (const timestamp of timestamps) {
      const snapshotUrl = snapshotRawUrl(source, timestamp);
      let sourceBody: unknown;
      try {
        const snapshot = await waybackFetch(snapshotUrl);
        if (!snapshot.ok) { count("wayback_error"); continue; }
        const text = await snapshot.text();
        sourceBody = source === "gogo" ? text : JSON.parse(text);
      } catch { count("wayback_error"); continue; }
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
          body: JSON.stringify({ attempt: "backfill", source, force: false, sourceBody, snapshotUrl }),
          signal: AbortSignal.timeout(120_000),
          redirect: "error",
        });
        if (response.status !== 200) {
          console.log(`${source} ${timestamp} -> post_error http=${response.status}`);
          count("post_error");
          process.exitCode = 1;
          continue;
        }
        const payload = z.object({ results: z.array(resultSchema).length(1) }).parse(await response.json());
        const result = payload.results[0];
        console.log(describeResult(source, timestamp, result));
        count(result.status);
      } catch {
        // Never print source bodies, API responses, or exception messages.
        console.log(`${source} ${timestamp} -> post_error`);
        count("post_error");
        process.exitCode = 1;
      }
    }
  }
  console.log(`totals ${JSON.stringify(totals)}`);
}

main().catch(() => {
  console.error("backfill configuration or runner failure");
  process.exitCode = 1;
});
