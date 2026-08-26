CREATE TYPE "public"."ingestion_attempt" AS ENUM('primary', 'retry_1', 'retry_2', 'final', 'manual');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('success', 'already_complete', 'not_expected', 'stale', 'invalid', 'fetch_error');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('ohaasa', 'gogo');--> statement-breakpoint
CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "source" NOT NULL,
	"edition_date" date NOT NULL,
	"source_date_label" text NOT NULL,
	"attribution" text,
	"content_hash" text NOT NULL,
	"parser_version" integer NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fortune_entries" (
	"edition_id" uuid NOT NULL,
	"zodiac_code" text NOT NULL,
	"rank" smallint NOT NULL,
	"comment" text NOT NULL,
	"advice_lines" jsonb NOT NULL,
	"lucky_hint" text,
	"lucky_color" text,
	"lucky_key" text,
	"money_score" smallint,
	"love_score" smallint,
	"work_score" smallint,
	"health_score" smallint,
	"winner_categories" jsonb NOT NULL,
	CONSTRAINT "fortune_entries_edition_id_zodiac_code_pk" PRIMARY KEY("edition_id","zodiac_code"),
	CONSTRAINT "fortune_entries_rank_range" CHECK ("fortune_entries"."rank" between 1 and 12)
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "source" NOT NULL,
	"target_date" date NOT NULL,
	"attempt" "ingestion_attempt" NOT NULL,
	"status" "ingestion_status",
	"source_date" date,
	"http_status" integer,
	"content_hash" text,
	"error_code" text,
	"error_summary" text,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "fortune_entries" ADD CONSTRAINT "fortune_entries_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "editions_source_date_unique" ON "editions" USING btree ("source","edition_date");--> statement-breakpoint
CREATE UNIQUE INDEX "fortune_entries_edition_rank_unique" ON "fortune_entries" USING btree ("edition_id","rank");