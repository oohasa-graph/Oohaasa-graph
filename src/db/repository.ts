import { and, count, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import {
  editions,
  fortuneEntries,
  INGESTION_ERROR_SUMMARY_MAX_LENGTH,
  ingestionRuns,
} from "@/db/schema";
import * as schema from "@/db/schema";
import type {
  IngestionAttempt,
  IngestionStatus,
  ParsedEdition,
  Source,
  ZodiacCode,
} from "@/features/fortune/domain";

export type PersistEditionInput = {
  contentHash: string;
  parserVersion: number;
  fetchedAt: Date;
};

export type PersistEditionMetadata = PersistEditionInput;

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
  hasEdition(source: Source, date: string): Promise<boolean>;
  saveEdition(
    edition: ParsedEdition,
    metadata: PersistEditionMetadata,
  ): Promise<void>;
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
  return {
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
      if (edition.fortunes.length !== 12) {
        throw new Error("An edition must contain exactly 12 fortune entries");
      }

      await db.transaction(async (transaction) => {
        const [storedEdition] = await transaction
          .insert(editions)
          .values({
            source: edition.source,
            editionDate: edition.editionDate,
            sourceDateLabel: edition.sourceDateLabel,
            attribution: edition.attribution,
            contentHash: metadata.contentHash,
            parserVersion: metadata.parserVersion,
            fetchedAt: metadata.fetchedAt,
          })
          .onConflictDoUpdate({
            target: [editions.source, editions.editionDate],
            set: {
              sourceDateLabel: edition.sourceDateLabel,
              attribution: edition.attribution,
              contentHash: metadata.contentHash,
              parserVersion: metadata.parserVersion,
              fetchedAt: metadata.fetchedAt,
              updatedAt: new Date(),
            },
          })
          .returning({ id: editions.id });

        if (!storedEdition) {
          throw new Error("Edition upsert did not return an id");
        }

        await transaction
          .delete(fortuneEntries)
          .where(eq(fortuneEntries.editionId, storedEdition.id));

        await transaction.insert(fortuneEntries).values(
          edition.fortunes.map((fortune) => ({
            editionId: storedEdition.id,
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
          })),
        );
      });
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
