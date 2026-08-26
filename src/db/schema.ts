import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { SOURCES, type WinnerCategory } from "@/features/fortune/domain";

export const sourceEnum = pgEnum("source", SOURCES);
export const ingestionAttemptEnum = pgEnum("ingestion_attempt", [
  "primary",
  "retry_1",
  "retry_2",
  "final",
  "manual",
]);
export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "success",
  "already_complete",
  "not_expected",
  "stale",
  "invalid",
  "fetch_error",
]);

export const editions = pgTable(
  "editions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: sourceEnum("source").notNull(),
    editionDate: date("edition_date").notNull(),
    sourceDateLabel: text("source_date_label").notNull(),
    attribution: text("attribution"),
    contentHash: text("content_hash").notNull(),
    parserVersion: integer("parser_version").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("editions_source_date_unique").on(
      table.source,
      table.editionDate,
    ),
  ],
);

export const fortuneEntries = pgTable(
  "fortune_entries",
  {
    editionId: uuid("edition_id")
      .references(() => editions.id, { onDelete: "cascade" })
      .notNull(),
    zodiacCode: text("zodiac_code").notNull(),
    rank: smallint("rank").notNull(),
    comment: text("comment").notNull(),
    adviceLines: jsonb("advice_lines").$type<string[]>().notNull(),
    luckyHint: text("lucky_hint"),
    luckyColor: text("lucky_color"),
    luckyKey: text("lucky_key"),
    moneyScore: smallint("money_score"),
    loveScore: smallint("love_score"),
    workScore: smallint("work_score"),
    healthScore: smallint("health_score"),
    winnerCategories: jsonb("winner_categories")
      .$type<WinnerCategory[]>()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.editionId, table.zodiacCode] }),
    uniqueIndex("fortune_entries_edition_rank_unique").on(
      table.editionId,
      table.rank,
    ),
    check(
      "fortune_entries_rank_range",
      sql`${table.rank} between 1 and 12`,
    ),
  ],
);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: sourceEnum("source").notNull(),
  targetDate: date("target_date").notNull(),
  attempt: ingestionAttemptEnum("attempt").notNull(),
  status: ingestionStatusEnum("status"),
  sourceDate: date("source_date"),
  httpStatus: integer("http_status"),
  contentHash: text("content_hash"),
  errorCode: text("error_code"),
  errorSummary: text("error_summary"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});
