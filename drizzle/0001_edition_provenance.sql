CREATE TYPE "public"."edition_origin" AS ENUM('live', 'wayback');--> statement-breakpoint
ALTER TYPE "public"."ingestion_attempt" ADD VALUE 'backfill';--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "origin" "edition_origin" DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "snapshot_url" text;