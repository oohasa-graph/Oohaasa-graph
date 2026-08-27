import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it } from "vitest";

import { createFortuneRepository } from "@/db/repository";
import * as schema from "@/db/schema";
import { getRankMarketData } from "@/features/rank-market/queries";
import { makeParsedEdition, metadata } from "@/test/factories";

async function setupDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { client, db, repository: createFortuneRepository(db) };
}

let clients: PGlite[] = [];

afterEach(async () => {
  await Promise.all(clients.map((client) => client.close()));
  clients = [];
});

describe("getRankMarketData", () => {
  it("keeps sources independent and includes all twelve latest entries", async () => {
    const { client, db, repository } = await setupDb();
    clients.push(client);

    await repository.saveEdition(
      makeParsedEdition({ source: "ohaasa", date: "2026-08-25", libraRank: 2 }),
      metadata("ohaasa-previous"),
    );
    await repository.saveEdition(
      makeParsedEdition({ source: "ohaasa", date: "2026-08-26", libraRank: 9 }),
      metadata("ohaasa-current"),
    );
    await repository.saveEdition(
      makeParsedEdition({ source: "gogo", date: "2026-08-25", libraRank: 4 }),
      metadata("gogo-previous"),
    );
    await repository.saveEdition(
      makeParsedEdition({ source: "gogo", date: "2026-08-26", libraRank: 1 }),
      metadata("gogo-current"),
    );

    const data = await getRankMarketData({
      days: 90,
      db,
      generatedAt: new Date("2026-08-26T20:15:00Z"),
    });

    expect(data.generatedAt).toBe("2026-08-26T20:15:00.000Z");
    expect(data.sources.ohaasa.latest).toMatchObject({
      source: "ohaasa",
      editionDate: "2026-08-26",
    });
    expect(data.sources.gogo.latest).toMatchObject({
      source: "gogo",
      editionDate: "2026-08-26",
    });
    expect(data.sources.ohaasa.latest?.entries).toHaveLength(12);
    expect(data.sources.gogo.latest?.entries).toHaveLength(12);
    expect(data.sources.ohaasa.latest?.entries.find((item) => item.zodiacCode === "libra")?.rank).toBe(9);
    expect(data.sources.gogo.latest?.entries.find((item) => item.zodiacCode === "libra")?.rank).toBe(1);
    expect(data.sources.ohaasa.movements.libra).toEqual({ places: 7, direction: "down" });
    expect(data.sources.gogo.movements.libra).toEqual({ places: 3, direction: "up" });
  });
});
