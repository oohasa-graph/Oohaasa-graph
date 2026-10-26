import { and, asc, count, eq, gte, inArray, lte } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import {
  editions,
  fortuneEntries,
  INGESTION_ERROR_SUMMARY_MAX_LENGTH,
  ingestionRuns,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { ZODIAC_CODES as schemaZodiacCodes } from "@/features/fortune/domain";
import type {
  EditionOrigin,
  IngestionAttempt,
  IngestionStatus,
  ParsedEdition,
  ParsedFortune,
  Source,
  ZodiacCode,
} from "@/features/fortune/domain";

export type PersistEditionInput = {
  origin: EditionOrigin;
  snapshotUrl: string | null;
  contentHash: string;
  parserVersion: number;
  fetchedAt: Date;
};

export type PersistEditionMetadata = PersistEditionInput;

export type ExportedEdition = ParsedEdition & {
  origin: EditionOrigin;
  snapshotUrl: string | null;
  fetchedAt: string;
  parserVersion: number;
  contentHash: string;
};

export function toParsedFortune(row: typeof fortuneEntries.$inferSelect): ParsedFortune {
  if (!schemaZodiacCodes.includes(row.zodiacCode as ZodiacCode)) throw new Error("Stored zodiac code is invalid");
  return {
    zodiacCode: row.zodiacCode as ZodiacCode,
    rank: row.rank,
    comment: row.comment,
    adviceLines: row.adviceLines,
    luckyHint: row.luckyHint,
    luckyColor: row.luckyColor,
    luckyKey: row.luckyKey,
    scores: { money: row.moneyScore, love: row.loveScore, work: row.workScore, health: row.healthScore },
    winnerCategories: row.winnerCategories,
  };
}

export type StartRunInput = {
  source: Source;
  targetDate: string;
  attempt: IngestionAttempt;
  startedAt: Date;
};

const INGESTION_ERROR_SUMMARIES = {
  SOURCE_STALE: "Source date is stale",
  EDITION_INVALID: "Source edition is invalid",
  SOURCE_FETCH_FAILED: "Source request failed",
} as const;

export type IngestionErrorCode = keyof typeof INGESTION_ERROR_SUMMARIES;

export type RunResult = {
  status: IngestionStatus;
  sourceDate: string | null;
  httpStatus?: number | null;
  contentHash?: string | null;
  errorCode: IngestionErrorCode | null;
  finishedAt?: Date;
};

export interface FortuneRepository {
  listEditions(from: string, to: string): Promise<ExportedEdition[]>;
  hasEdition(source: Source, date: string): Promise<boolean>;
  saveEdition(
    edition: ParsedEdition,
    metadata: PersistEditionMetadata,
  ): Promise<void>;
  insertEditionIfAbsent(edition: ParsedEdition, metadata: PersistEditionMetadata): Promise<boolean>;
  startRun(input: StartRunInput): Promise<string>;
  finishRun(runId: string, result: RunResult): Promise<void>;
  countEntries(source: Source, date: string): Promise<number>;
  getRank(
    source: Source,
    date: string,
    zodiac: ZodiacCode,
  ): Promise<number | null>;
}

export function createFortuneRepository<
  TQueryResult extends PgQueryResultHKT,
>(
  db: PgDatabase<TQueryResult, typeof schema>,
): FortuneRepository {
  async function persist(edition: ParsedEdition, metadata: PersistEditionMetadata, onlyIfAbsent: boolean): Promise<boolean> {
    if (edition.fortunes.length !== 12) {
      throw new Error("An edition must contain exactly 12 fortune entries");
    }
    return db.transaction(async (transaction) => {
      const values = {
        source: edition.source,
        editionDate: edition.editionDate,
        sourceDateLabel: edition.sourceDateLabel,
        attribution: edition.attribution,
        ...metadata,
      };
      const insert = transaction.insert(editions).values(values);
      const target = [editions.source, editions.editionDate];
      const [stored] = await (onlyIfAbsent
        ? insert.onConflictDoNothing({ target })
        : insert.onConflictDoUpdate({ target, set: { ...values, updatedAt: new Date() } })
      ).returning({ id: editions.id });
      if (!stored) return false;
      if (!onlyIfAbsent) {
        await transaction.delete(fortuneEntries).where(eq(fortuneEntries.editionId, stored.id));
      }
      await transaction.insert(fortuneEntries).values(edition.fortunes.map((fortune) => ({
        editionId: stored.id,
        zodiacCode: fortune.zodiacCode,
        rank: fortune.rank,
        comment: fortune.comment,
        adviceLines: fortune.adviceLines,
        luckyHint: fortune.luckyHint,
        luckyColor: fortune.luckyColor,
        luckyKey: fortune.luckyKey,
        moneyScore: fortune.scores.money,
        loveScore: fortune.scores.love,
        workScore: fortune.scores.work,
        healthScore: fortune.scores.health,
        winnerCategories: fortune.winnerCategories,
      })));
      return true;
    });
  }

  return {
    async listEditions(from, to) {
      const stored = await db.select().from(editions)
        .where(and(gte(editions.editionDate, from), lte(editions.editionDate, to)))
        .orderBy(asc(editions.source), asc(editions.editionDate));
      if (!stored.length) return [];
      const entries = await db.select().from(fortuneEntries)
        .where(inArray(fortuneEntries.editionId, stored.map((edition) => edition.id)))
        .orderBy(asc(fortuneEntries.rank));
      const byEdition = new Map<string, ParsedFortune[]>();
      for (const entry of entries) {
        const list = byEdition.get(entry.editionId) ?? [];
        list.push(toParsedFortune(entry));
        byEdition.set(entry.editionId, list);
      }
      return stored.map((edition) => ({
        source: edition.source,
        editionDate: edition.editionDate,
        sourceDateLabel: edition.sourceDateLabel,
        attribution: edition.attribution,
        origin: edition.origin,
        snapshotUrl: edition.snapshotUrl,
        fetchedAt: edition.fetchedAt.toISOString(),
        parserVersion: edition.parserVersion,
        contentHash: edition.contentHash,
        fortunes: byEdition.get(edition.id) ?? [],
      }));
    },

    async hasEdition(source, date) {
      const rows = await db
        .select({ id: editions.id })
        .from(editions)
        .where(
          and(eq(editions.source, source), eq(editions.editionDate, date)),
        )
        .limit(1);

      return rows.length === 1;
    },

    async saveEdition(edition, metadata) {
      await persist(edition, metadata, false);
    },

    insertEditionIfAbsent(edition, metadata) {
      return persist(edition, metadata, true);
    },

    async startRun(input) {
      const [run] = await db
        .insert(ingestionRuns)
        .values({
          source: input.source,
          targetDate: input.targetDate,
          attempt: input.attempt,
          startedAt: input.startedAt,
        })
        .returning({ id: ingestionRuns.id });

      if (!run) {
        throw new Error("Ingestion run insert did not return an id");
      }

      return run.id;
    },

    async finishRun(runId, result) {
      await db
        .update(ingestionRuns)
        .set({
          status: result.status,
          sourceDate: result.sourceDate,
          httpStatus: result.httpStatus ?? null,
          contentHash: result.contentHash ?? null,
          errorCode: result.errorCode,
          errorSummary: summaryForErrorCode(result.errorCode),
          finishedAt: result.finishedAt ?? new Date(),
        })
        .where(eq(ingestionRuns.id, runId));
    },

    async countEntries(source, date) {
      const [result] = await db
        .select({ value: count() })
        .from(fortuneEntries)
        .innerJoin(editions, eq(fortuneEntries.editionId, editions.id))
        .where(
          and(eq(editions.source, source), eq(editions.editionDate, date)),
        );

      return result?.value ?? 0;
    },

    async getRank(source, date, zodiac) {
      const [result] = await db
        .select({ rank: fortuneEntries.rank })
        .from(fortuneEntries)
        .innerJoin(editions, eq(fortuneEntries.editionId, editions.id))
        .where(
          and(
            eq(editions.source, source),
            eq(editions.editionDate, date),
            eq(fortuneEntries.zodiacCode, zodiac),
          ),
        )
        .limit(1);

      return result?.rank ?? null;
    },
  };
}

function summaryForErrorCode(
  errorCode: IngestionErrorCode | null,
): string | null {
  if (errorCode === null) {
    return null;
  }

  if (!Object.hasOwn(INGESTION_ERROR_SUMMARIES, errorCode)) {
    throw new Error("Unsupported ingestion error code");
  }

  const summary = INGESTION_ERROR_SUMMARIES[errorCode];
  if (summary.length > INGESTION_ERROR_SUMMARY_MAX_LENGTH) {
    throw new Error("Ingestion error summary exceeds the application limit");
  }

  return summary;
}
