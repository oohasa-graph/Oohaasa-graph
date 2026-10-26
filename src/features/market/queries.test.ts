import type { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it } from "vitest";
import { getMarketData } from "@/features/market/queries";
import { makeParsedEdition, metadata } from "@/test/factories";
import { createTestRepository } from "@/test/pglite";

let client: PGlite | undefined;
afterEach(async () => { await client?.close(); });

describe("market history read model", () => {
  it("keeps full latest entries, honest gaps, independent sources, and all stored rank history", async () => {
    const test = await createTestRepository();
    client = test.client;
    for (const date of ["2026-10-23", "2026-10-26", "2026-10-27"]) {
      await test.repository.saveEdition(makeParsedEdition({ source: "ohaasa", date }), metadata(date));
    }
    const options = { db: test.db, generatedAt: new Date("2026-10-26T03:00:00Z") };
    const data = await getMarketData(options);
    expect(data.currentDate).toBe("2026-10-26");
    const ohaasa = data.sources.ohaasa;
    expect(ohaasa.series.dates[0]).toBe("2026-07-28");
    for (const date of ["2026-10-23", "2026-10-26"]) {
      expect(ohaasa.series.ranks.libra[ohaasa.series.dates.indexOf(date)]).toBe(7);
    }
    expect(ohaasa.series.ranks.libra[ohaasa.series.dates.indexOf("2026-10-21")]).toBeNull();
    expect(ohaasa.latest?.editionDate).toBe("2026-10-26");
    expect(ohaasa.latest?.entries).toHaveLength(12);
    expect(ohaasa.latest?.entries[0].comment).toMatch(/^Invented/);
    expect(data.sources.gogo.latest).toBeNull();
    expect(Object.values(data.sources.gogo.series.ranks).flat().every((rank) => rank === null)).toBe(true);

    await test.repository.saveEdition(makeParsedEdition({ source: "ohaasa", date: "2021-06-01" }), metadata("archive"));
    const expanded = await getMarketData(options);
    expect(expanded.sources.ohaasa.series.dates[0]).toBe("2021-06-01");
    expect(expanded.sources.ohaasa.series.dates.at(-1)).toBe("2026-10-26");
    expect(expanded.sources.gogo.series.dates[0]).toBe("2026-07-28");
    expect(expanded.generatedAt).toBe("2026-10-26T03:00:00.000Z");
  });
});
