import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveEditionDate, parseSnapshotUrl } from "./snapshot";
import ohaasa from "@/test/fixtures/ohaasa-valid.json";

const original = "https://www.tv-asahi.co.jp/goodmorning/uranai/";
const raw = (ts: string) => `https://web.archive.org/web/${ts}id_/${original}`;

describe("Wayback snapshots", () => {
  it("parses raw HTTPS captures and converts UTC to JST", () => {
    expect(parseSnapshotUrl(raw("20250601013136"))).toEqual({ timestamp: "20250601013136", capturedJstDate: "2025-06-01", originalUrl: original });
    expect(parseSnapshotUrl(raw("20250531160000"))?.capturedJstDate).toBe("2025-06-01");
  });
  it.each([
    raw("20250601013136").replace("https:", "http:"),
    raw("20250601013136").replace("id_", ""),
    raw("20250601013136").replace("web.archive.org", "evil.example"),
    raw("2025060101313"), raw("20251301000000"), raw("20250230000000"),
  ])("rejects invalid captures", (url) => expect(parseSnapshotUrl(url)).toBeNull());
  it("derives content dates, including the next edition across midnight", () => {
    const html = readFileSync("src/test/fixtures/gogo-current.html", "utf8");
    expect(deriveEditionDate("gogo", html, "2026-10-25")).toBe("2026-10-26");
    expect(deriveEditionDate("gogo", html, "2026-10-26")).toBe("2026-10-26");
    const date = ohaasa[0].onair_date;
    const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
    const previous = new Date(Date.parse(iso) - 864e5).toISOString().slice(0, 10);
    expect(deriveEditionDate("ohaasa", ohaasa, previous)).toBe(iso);
    expect(deriveEditionDate("gogo", "<html></html>", "2026-10-26")).toBeNull();
  });
});
