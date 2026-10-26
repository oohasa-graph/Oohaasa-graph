# Rank Market Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain rank page with the approved Japanese-first kawaii market UI (main page + market board + language page), and give it real history by adding edition provenance, a Wayback Machine backfill, and a private GitHub mirror of every edition.

**Architecture:**
- **Data layer:** provenance columns are added through a migration that runs during the Vercel production build. Backfill is a new `backfill` attempt on the existing protected ingest endpoint, fed by a GitHub Actions runner script that reads Wayback snapshots. A read-only export endpoint, authenticated with the existing `INGEST_SECRET`, feeds a public-repo workflow that pushes JSON files to a private repo using a private-repository-only GitHub App (owner-approved amendment below).
- **UI:** a new `src/features/market/` feature replaces `src/features/rank-market/`. It has a rank-only history read model on an expected-morning axis, pure metrics, i18n messages, original SVG "mochi" characters, and three routes: `/`, `/board`, `/language`.

**Tech Stack:** Next.js 16.3 (App Router), React 19, TypeScript, Drizzle ORM 0.45 with Neon serverless and PGlite for tests, Vitest 4, Playwright 1.62, `next/font/google`, GitHub Actions, `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-26-rank-market-redesign-design.md`. Visual reference: `docs/superpowers/specs/2026-10-26-rank-market-redesign-prototype.html`. Open it in a browser; its CSS and SVG are the source for colors, spacing, and the mochi geometry.

## Global Constraints

- No paid service, plan, or API. Vercel Hobby, Neon free, GitHub free. Never change a spending limit.
- `vercel.json` keeps `"regions": ["hnd1"]`.
- No new Vercel environment variables. Use only the existing `DATABASE_URL`, `INGEST_SECRET`, and `SOURCE_USER_AGENT`.
- The main repo and its Actions logs are public. Never print, log, or commit fortune prose there: no comment, advice, lucky values, or archived page text. Ranks, scores, winner categories, dates, statuses, and counts are allowed. Test fixtures use invented text only.
- Existing daily ingestion behavior is unchanged: schedule, statuses, the 424 rule for `final`/`manual`, idempotency, and the text-free diagnostic.
- Next.js 16 differs from older versions. Before writing app code, read the guide for the API you touch in `node_modules/next/dist/docs/`, in particular:
  - `01-app/03-api-reference/03-file-conventions/page.md` (`searchParams` is a Promise)
  - `01-app/03-api-reference/04-functions/cookies.md` (`cookies()` is async)
  - `01-app/01-getting-started/13-fonts.md`
  - `01-app/03-api-reference/03-file-conventions/route.md`
- First visit renders in Japanese, regardless of browser language. Fortune text from the shows is never translated.
- No page-level horizontal scroll at 390 px width on `/`, `/board`, or `/language`.
- Up is pink (`--pink`), down is blue (`--sky`).
- Characters are original. Never use show mascots or artwork.
- Commit messages use conventional commits plus the repo's trailer convention (`Constraint:`, `Confidence:`, `Scope-risk:`, and so on), ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Owner-approved Task 5 authentication amendment (2026-10-26)

The organization disables deploy keys globally. The owner explicitly forbids enabling that policy for the public repository or organization, and approved the GitHub App alternative after an independent Claude consultation. These instructions supersede only the deploy-key portions of Task 5; all other requirements remain unchanged.

- Register an organization-owned private app with Contents read/write and automatic Metadata read only. No webhooks, events, organization permissions or workflow permissions.
- Install using **Only select repositories**, choosing `Oohaasa-graph-data` only. Do not install on the public repository.
- Store `DATA_APP_CLIENT_ID` and `DATA_APP_PRIVATE_KEY` as Actions secrets in the public source repository. No Vercel variable or spending-limit change.
- Use SHA-pinned `actions/create-github-app-token` with explicit `owner: oohasa-graph`, `repositories: Oohaasa-graph-data`, and `permission-contents: write`; checkout the private repository using this token. Keep automatic revocation enabled.
- Restrict the export job to scheduled and manually dispatched runs in the source repository, never untrusted PR execution. Keep the public repository token read-only.
- Owner offered to perform the browser-only app registration/installation. Exact setup steps are in `docs/operations.md`. Verify installation scope, permissions, both Actions secrets and unchanged organization deploy-key policy before completing Phase A.

## Review Focus

1. **Bad or missing URL params** (`?sign=foo&range=10y&source=x`, or repeated params): render defaults (libra, ohaasa, 1m). Never crash or 500. *Pinned in Task 10, `parseMarketParams` tests.*
2. **A source with no stored editions, or only today's:** every view renders "no data" or "−". No `NaN`, `Infinity`, or empty SVG paths. *Pinned in Tasks 7 and 10, `emptyMarketFixture` tests.*
3. **Language page return target** (`/language?return=//evil.com` or `https://evil.com`): it must go back only to same-site paths. *Pinned in Task 8, `sanitizeReturnPath` tests.*
4. **Backfill posting a snapshot URL for the wrong source, or a non-Wayback URL:** reject with 400 and never save. A backfill must never replace an existing edition. *Pinned in Task 2, route and service tests.*
5. **Workflow or script output leaking fortune text:** the export writer and backfill runner print only counts, dates, and statuses. *Pinned in Task 3 (`describeResult` test) and Task 5 (writer console spy test), and checked live in Task 14 with a kana grep of the logs.*

---

## Execution checkpoint (2026-10-26)

- Native implementation in Orca worktree branch `insung3511/eagleray`, based on `f576dd8`. The approved branch is checked out in the parent worktree, so it was not switched or modified. Phase A was pushed without force at `40469c0`; both Vercel deployment and GitHub CI succeeded.
- Tasks 1–4 are complete, each committed after RED/GREEN tests: `0cfe1cb`, `ab03219`, `584a3a9`, `c7dd621`.
- Task 5 code, workflow, tests and operations documentation are implemented. The private repository exists and its visibility is verified `PRIVATE`.
- **Task 5 setup complete:** owner created the app key and both Actions secrets. The agent completed the authorized private-only installation (`175369682`), verified the selected repository in GitHub's installation settings and confirmed Contents write / Metadata read only via API. Organization deploy keys remain disabled. No secret values were read. The workflow additionally checks minted-token repository scope before checkout.
- Latest checks: lint, typecheck, all **132 tests / 27 files**, and production build pass. LSP retained stale missing-module findings from the RED stage despite successful fresh compiler/build checks; those were marked stale false positives. The app workflow has three regression tests covering explicit private-repository token scope, runtime scope verification, trusted triggers and pinned actions. The host now has about 11 GiB free; no unrelated files were deleted by the agent.
- Task 6 is complete: expected-morning axes, rank-only archive queries, latest full entries, production-protected invented fixtures. RED/GREEN tests include holidays, gaps, empty sources, future exclusion and earliest archive expansion. Task 7 is complete: null-safe ranges/statistics, adjacent-morning movers, gap-breaking streaks, weekly awards, moods and stamp colors; all six metric tests passed after RED. Tasks 8–14 have not started. The Phase A production build succeeded; live backfill/export and whole-branch review remain pending.
- Next: verify and push Phase B as `HEAD:feature/fortune-graph-app` without force, then Task 8 languages. Do not change deploy-key policies. Continue Tasks 6–13 natively, dispatch one fresh whole-branch reviewer, then perform Task 14. The earlier Claude consultation verified only the authentication proposal; it does not replace the whole-branch review.

## Execution checkpoint (2026-10-26, Orca UI wave)

- Tasks 8–13 are implemented in the `insung3511/eagleray` worktree on top of `dad5980`, **uncommitted** (the Orca coordinator forbade commits, pushes, and deploys for this wave). Nothing is published; the live site still serves the old UI until a later, separately verified release.
- `/` and `/board` render `MainView` and `BoardView` from `loadMarketData`; `/language` stores `rm-lang` and returns through `sanitizeReturnPath`. The old `rank-market` feature, its fixtures, and `tests/private-rank-market.spec.ts` are deleted; nothing imports them.
- Deviations (each recorded as a ruling in the local ledger): `sanitizeReturnPath` also rejects control/whitespace characters and anything WHATWG URL parsing turns into another origin or a `//` path (e.g. `/\t/x`, `/.//x`, `/%2e//x`); "today" values use the series up to the newest stored edition; the other show's dotted line is aligned by date; the old `overflow-x: hidden` on `html, body` was removed so overflow checks are honest; extra copy keys `overall`, `source`, `range`.
- Checks (real exit codes): lint 0, typecheck 0, Vitest 0 (30 files, 161 tests), `npm run build` 0, Playwright 0 (27 passed, 1 phone-only test skipped on desktop). Playwright ran through the installed Google Chrome (`channel: "chrome"`, local git-ignored config) because the bundled Chromium revision is not in the browser cache; `playwright.config.ts` and CI are unchanged.
- Fixture pages were inspected against the prototype at 1280 px and 390 px. That review found and fixed a phone bug where the stamp calendar's pinned sign column scrolled away (now covered by the phone e2e test). The design-playbook audit was not run (its package marker is missing).
- Review follow-up (still uncommitted): the independent UI review found no blockers. Fixed:
  - Cross-year short ranges keep day labels; `YYYY/M` only for spans over 120 days in different years.
  - The other show's dotted line follows that show's own expected mornings (`comparisonLine`): its days off never break it, its missing mornings always do, even without a slot on this axis.
  - Rank race line widths follow point density (lone mornings keep full width); faces sit on each sign's last drawn morning; 4 date ticks under 720 px.
  - Redundant `"use client"` removed from `rank-race.tsx` and `stamp-calendar.tsx` (TS71007).
  - The stamp scroller is a focusable, localized region with a visible focus ring.
  - Deferred by the coordinator: weekend/pre-ingest stale and coverage semantics (need a product decision), `useMarketState` URL reading, the language-switch history entry, localized titles, and payload size.
  - Checks: lint 0, typecheck 0, Vitest 0 (31 files, 173 tests).
- Remaining: owner/coordinator commit, then Task 14 (deploy, backfill, export, live checks).

## File Map

**Data layer**
- `src/features/fortune/domain.ts`: add `backfill` attempt and `EDITION_ORIGINS`.
- `src/features/fortune/source-urls.ts` (new): `SOURCE_URLS`, moved out of the ingest route.
- `src/db/schema.ts`, `drizzle/0001_edition_provenance.sql` (generated): provenance columns.
- `src/db/repository.ts`: provenance metadata, `insertEditionIfAbsent`, `listEditions`.
- `src/db/migrate-on-deploy.ts` and `scripts/migrate-on-deploy.ts` (new): production-only migrations at build time.
- `src/features/backfill/snapshot.ts` (new): Wayback URL parsing and edition-date derivation, used by the route.
- `src/features/backfill/wayback.ts` and `scripts/backfill-wayback.ts` (new): the runner.
- `.github/workflows/backfill.yml` (new).
- `src/app/api/internal/export/route.ts` (new): read-only export.
- `src/features/export/write-files.ts` and `scripts/write-export-files.ts` (new): mirror writer.
- `.github/workflows/export-data.yml` (new).

**Read model and metrics** (`src/features/market/`)
- `types.ts`, `series.ts`, `queries.ts`, `load-data.ts`, `metrics.ts`.
- `src/test/fixtures/market-fixture.ts`.

**UI** (`src/features/market/`)
- `i18n.ts`, `signs.ts`, `language.ts`, `market-params.ts`, `chart-geometry.ts`, `use-element-width.ts`, `use-market-state.ts`, `market.module.css`.
- `components/*`.
- Routes: `src/app/page.tsx`, `src/app/board/page.tsx`, `src/app/language/page.tsx`.
- `src/app/layout.tsx`, `src/app/globals.css`.

**Removed:** `src/features/rank-market/**`, `src/test/fixtures/rank-market-fixture.ts`, `src/test/fixtures/dashboard-data.ts` (only if nothing else imports them), `tests/private-rank-market.spec.ts`.

---

## Phase A: History data

### Task 1: Edition provenance and migrate-on-deploy

**Files:**
- Modify: `src/features/fortune/domain.ts`, `src/db/schema.ts`, `src/db/repository.ts`, `src/features/ingestion/service.ts`, `src/test/factories.ts`, `src/test/pglite.ts`, `package.json`
- Create: `drizzle/0001_edition_provenance.sql` and the `drizzle/meta` update (generated), `src/db/migrate-on-deploy.ts`, `scripts/migrate-on-deploy.ts`
- Test: `src/db/repository.test.ts`, `src/db/migrate-on-deploy.test.ts`

**Interfaces:**
- Produces:
  - `EDITION_ORIGINS = ["live", "wayback"] as const` and `type EditionOrigin`, in `domain.ts`.
  - `IngestionAttempt` now includes `"backfill"`.
  - `PersistEditionInput = { contentHash: string; parserVersion: number; fetchedAt: Date; origin: EditionOrigin; snapshotUrl: string | null }`.
  - `FortuneRepository.insertEditionIfAbsent(edition: ParsedEdition, metadata: PersistEditionMetadata): Promise<boolean>`. It returns `false` and writes nothing when an edition already exists for that source and date.
  - `createTestRepository()` now returns `{ client, db, repository }`.
  - `shouldMigrate(env: Record<string, string | undefined>): boolean`.

- [ ] **Step 1: Write failing repository tests** in `src/db/repository.test.ts`.
  - `it("stores edition origin and snapshot url")`: call `saveEdition(makeParsedEdition({ source: "gogo", date: "2026-10-01" }), { ...metadata("a"), origin: "wayback", snapshotUrl: "https://web.archive.org/web/20261001000000id_/https://www.tv-asahi.co.jp/goodmorning/uranai/" })`. Then select from `editions` with `db`. Expect `origin === "wayback"` and `snapshotUrl` equal to that URL.
  - `it("insertEditionIfAbsent never replaces an existing edition")`:
    1. Call `saveEdition` with `libraRank: 3`.
    2. Call `insertEditionIfAbsent` with `libraRank: 9` and wayback metadata.
    3. Expect it resolves `false`.
    4. Expect `getRank("gogo", date, "libra")` to be `3`.
  - `it("insertEditionIfAbsent inserts a missing edition")`: expect it resolves `true` and `countEntries` is `12`.
- [ ] **Step 2: Write the failing `src/db/migrate-on-deploy.test.ts`.**
  - `shouldMigrate({ VERCEL_ENV: "production" })` is `true`.
  - `{ VERCEL_ENV: "preview" }` is `false`.
  - `{}` is `false`.
- [ ] **Step 3: Run the tests and see them fail.**
  `npm test -- --run src/db/repository.test.ts src/db/migrate-on-deploy.test.ts` must FAIL: the type errors or missing exports.
- [ ] **Step 4: Implement the schema change.**
  - `editionOriginEnum = pgEnum("edition_origin", EDITION_ORIGINS)`.
  - `editions.origin`: `editionOriginEnum("origin").notNull().default("live")`.
  - `editions.snapshotUrl`: `text("snapshot_url")`.
  - Add `"backfill"` to `ingestionAttemptEnum`.
  - Then run `npm run db:generate -- --name edition_provenance`.
- [ ] **Step 5: Inspect the generated SQL.** `drizzle/0001_edition_provenance.sql` must contain only additive statements:
  - `CREATE TYPE "public"."edition_origin" AS ENUM('live', 'wayback')`
  - `ALTER TYPE "public"."ingestion_attempt" ADD VALUE 'backfill'`
  - `ALTER TABLE "editions" ADD COLUMN "origin" "edition_origin" DEFAULT 'live' NOT NULL`
  - `ALTER TABLE "editions" ADD COLUMN "snapshot_url" text`

  Run `grep -i "drop" drizzle/0001_edition_provenance.sql`. It must print nothing.
- [ ] **Step 6: Implement the repository changes.**
  - `saveEdition` writes `origin` and `snapshotUrl` on insert and in its conflict update.
  - `insertEditionIfAbsent` uses `onConflictDoNothing({ target: [editions.source, editions.editionDate] })` with `.returning()`. It inserts the 12 entries only when a row came back, all in one transaction.
  - `metadata(seed)` in factories adds `origin: "live", snapshotUrl: null`.
  - `ingestSource` passes `origin: "live", snapshotUrl: null` to `saveEdition`.
  - `createTestRepository` also returns `db`.
- [ ] **Step 7: Implement `src/db/migrate-on-deploy.ts`** (`shouldMigrate`: `true` only for `VERCEL_ENV === "production"`) **and `scripts/migrate-on-deploy.ts`.**
  - The script uses relative imports.
  - When it skips, it logs `migrations skipped (VERCEL_ENV=<value or unset>)` and exits 0.
  - Otherwise it builds `Pool` from `@neondatabase/serverless` with `process.env.DATABASE_URL`, uses `drizzle` from `drizzle-orm/neon-serverless`, and runs `migrate(db, { migrationsFolder: "drizzle" })` from `drizzle-orm/neon-serverless/migrator`. Then it calls `pool.end()` and logs `migrations applied`.
  - Any error exits 1, which fails the deploy.
  - Set `package.json` `"build": "tsx scripts/migrate-on-deploy.ts && next build"`.
- [ ] **Step 8: Run the checks.**
  - `npm test -- --run src/db src/features/ingestion` must PASS.
  - `npm run lint && npm run typecheck` must be clean.
  - `npm run build` must print `migrations skipped (VERCEL_ENV=unset)` and succeed.
- [ ] **Step 9: Commit** with the message `feat: record edition provenance and migrate on production build`.

### Task 2: Backfill attempts on the ingest endpoint

**Files:**
- Create: `src/features/fortune/source-urls.ts`, `src/features/backfill/snapshot.ts`
- Modify: `src/app/api/internal/ingest/route.ts` (import `SOURCE_URLS`), `src/features/ingestion/service.ts`
- Test: `src/features/backfill/snapshot.test.ts`, `src/features/ingestion/service.test.ts`, `src/app/api/internal/ingest/route.test.ts`

**Interfaces:**
- Consumes: `insertEditionIfAbsent` and `EditionOrigin` from Task 1.
- Produces:
  - `SOURCE_URLS: Readonly<Record<Source, string>>`. Values are `https://www.asahi.co.jp/data/ohaasa2020/horoscope.json` and `https://www.tv-asahi.co.jp/goodmorning/uranai/`.
  - `parseSnapshotUrl(url: string): { timestamp: string; capturedJstDate: string; originalUrl: string } | null`. It accepts only `https://web.archive.org/web/<14 digits>id_/<originalUrl>`. `capturedJstDate` is the JST calendar date of that UTC timestamp.
  - `deriveEditionDate(source: Source, body: unknown, capturedJstDate: string): string | null`. It runs `parseOhaasa`/`parseGogo` with `expectedDate = capturedJstDate`. Success returns `capturedJstDate`; `StaleSourceError` returns `error.sourceDate`; any other error returns `null`.
  - `IngestSourceInput.snapshotUrl?: string`.

- [ ] **Step 1: Write failing tests in `snapshot.test.ts`.**
  - `parseSnapshotUrl("https://web.archive.org/web/20250601013136id_/https://www.tv-asahi.co.jp/goodmorning/uranai/")` returns `{ timestamp: "20250601013136", capturedJstDate: "2025-06-01", originalUrl: "https://www.tv-asahi.co.jp/goodmorning/uranai/" }`.
  - Timestamp `20250531160000` gives `capturedJstDate` `"2025-06-01"` (the cross-midnight case).
  - These return `null`: an `http://` scheme, a URL without `id_`, host `evil.example`, and a 13-digit timestamp.
  - `deriveEditionDate("gogo", <src/test/fixtures/gogo-current.html>, "2026-10-25")` returns `"2026-10-26"`. With `"2026-10-26"` it also returns `"2026-10-26"`.
  - `deriveEditionDate("ohaasa", <ohaasa-valid.json parsed>, <that fixture's date minus one day>)` returns the fixture's date.
  - `deriveEditionDate("gogo", "<html></html>", "2026-10-26")` returns `null`.
- [ ] **Step 2: Write failing service tests.**
  - `it("backfill inserts a wayback edition")`:
    - Input: attempt `"backfill"`, `sourceResponse` set, `snapshotUrl` set, `hasEdition` resolves `false`.
    - Expect `insertEditionIfAbsent` called with metadata `{ origin: "wayback", snapshotUrl }`, `saveEdition` not called, and status `"success"`.
  - `it("backfill never replaces an edition, even with force")`: `force: true`, `hasEdition` `true`. Expect status `"already_complete"` and no insert.
  - `it("backfill reports already_complete when the insert races")`: `insertEditionIfAbsent` resolves `false`. Expect `"already_complete"`.
- [ ] **Step 3: Write failing route tests.** These use the existing `createPostHandler` test harness.
  - A valid backfill body (`{ attempt: "backfill", source: "gogo", force: false, sourceBody: <gogo-current html>, snapshotUrl: "https://web.archive.org/web/20261025210000id_/https://www.tv-asahi.co.jp/goodmorning/uranai/" }`) calls `ingest` with `{ attempt: "backfill", targetDate: "2026-10-26", snapshotUrl }` and responds 200.
  - Each of these responds 400:
    - a backfill without `snapshotUrl`
    - a backfill without `sourceBody`
    - a backfill with `source: "all"`
    - a backfill whose `snapshotUrl` original is the Ohaasa URL while `source` is `"gogo"`
    - `snapshotUrl` on a `manual` attempt
    - a non-Wayback `snapshotUrl`
  - A backfill whose content can't be parsed still calls `ingest`, with `targetDate` equal to `capturedJstDate`, and responds 200 (the run is recorded as `invalid`).
- [ ] **Step 4: Run the tests and see them fail.**
  `npm test -- --run src/features/backfill src/features/ingestion src/app/api/internal/ingest` must FAIL.
- [ ] **Step 5: Implement.**
  - Add `"backfill"` and `snapshotUrl` to the route's zod schema. Add a refine so that backfill requires `snapshotUrl`, `sourceBody`, and a single source, and non-backfill attempts must not carry `snapshotUrl`.
  - For backfill, the route checks `parseSnapshotUrl(...)?.originalUrl === SOURCE_URLS[source]` (400 otherwise). It sets `targetDate = deriveEditionDate(...) ?? capturedJstDate`.
  - The 424 rule is unchanged, so backfill always responds 200.
  - In `ingestSource`, the backfill branch skips `force`, persists with `insertEditionIfAbsent`, and maps `false` to `already_complete`. Live paths are unchanged.
- [ ] **Step 6: Run the checks.** The same test command must PASS, and `npm run lint && npm run typecheck` must be clean.
- [ ] **Step 7: Commit** with the message `feat: accept Wayback backfill attempts on the ingest endpoint`.

### Task 3: Wayback backfill runner and workflow

**Files:**
- Create: `src/features/backfill/wayback.ts`, `scripts/backfill-wayback.ts`, `.github/workflows/backfill.yml`
- Test: `src/features/backfill/wayback.test.ts`

**Interfaces:**
- Consumes: `SOURCE_URLS`, `parseSnapshotUrl` (Task 2).
- Produces:
  - `cdxQueryUrl(source: Source, from: string, to: string): string`. It returns `https://web.archive.org/cdx/search/cdx?url=<SOURCE_URLS[source] without scheme>&output=json&fl=timestamp&filter=statuscode:200&from=<YYYYMMDD>&to=<YYYYMMDD>`.
  - `parseCdxTimestamps(json: unknown): string[]`. It drops the header row, keeps only 14-digit strings, and returns them unique and ascending.
  - `snapshotRawUrl(source: Source, timestamp: string): string`, which returns `https://web.archive.org/web/${timestamp}id_/${SOURCE_URLS[source]}`.
  - `describeResult(source: Source, timestamp: string, result: { status: string; targetDate: string }): string`, which returns `"<source> <timestamp> -> <status> <targetDate>"`.

- [ ] **Step 1: Write failing tests.**
  - `cdxQueryUrl("gogo", "2021-06-01", "2026-10-25")` equals `https://web.archive.org/cdx/search/cdx?url=www.tv-asahi.co.jp/goodmorning/uranai/&output=json&fl=timestamp&filter=statuscode:200&from=20210601&to=20261025`.
  - `parseCdxTimestamps([["timestamp"], ["20250601013136"], ["bad"], ["20250101000000"], ["20250601013136"]])` returns `["20250101000000", "20250601013136"]`. A non-array input returns `[]`.
  - `parseSnapshotUrl(snapshotRawUrl("ohaasa", "20250601013136"))?.originalUrl === SOURCE_URLS.ohaasa` (round trip).
  - `describeResult("gogo", "20250601013136", { status: "success", targetDate: "2025-06-02", comment: "Invented prose" } as never)` contains no `"Invented"`.
- [ ] **Step 2: Run the tests and see them fail.** `npm test -- --run src/features/backfill/wayback.test.ts` must FAIL.
- [ ] **Step 3: Implement `wayback.ts`** so the tests pass.
- [ ] **Step 4: Implement `scripts/backfill-wayback.ts`.**
  - Args: `--source all|ohaasa|gogo --from YYYY-MM-DD --to YYYY-MM-DD`.
  - Env: `INGEST_URL`, `INGEST_SECRET`, each required, exit 1 if missing.
  - For each source, fetch the CDX list. Then, sequentially for each timestamp:
    1. `fetch(snapshotRawUrl(...))` with User-Agent `Oohaasa-graph/1.0 (github.com/oohasa-graph)`. Node's fetch decompresses gzip.
    2. On a non-200, count `wayback_error` and continue.
    3. Build the body: Gogo uses the text; Ohaasa uses `JSON.parse(text)`, counting `wayback_error` and continuing on failure.
    4. POST `{ attempt: "backfill", source, force: false, sourceBody, snapshotUrl }` with `Authorization: Bearer`.
    5. Print `describeResult` for each result.
    6. Wait at least 1000 ms before the next Wayback request.
  - At the end, print totals per status.
  - Exit 1 only if a POST returned a non-200 status.
  - Never print bodies.
- [ ] **Step 5: Create `.github/workflows/backfill.yml`.**
  - `workflow_dispatch` inputs:
    - `source` (choice all/ohaasa/gogo, default all)
    - `from` (default `2021-06-01`)
    - `to` (default `2026-10-25`)
  - Job settings: `ubuntu-latest`, `timeout-minutes: 240`.
  - Steps: `actions/checkout@v4`, `actions/setup-node@v4` (node 22, npm cache), `npm ci`, then `npx tsx scripts/backfill-wayback.ts --source "$SOURCE" --from "$FROM" --to "$TO"`.
  - Env comes from `secrets.INGEST_URL` and `secrets.INGEST_SECRET`. Inputs are passed through `env:`, never interpolated into the script body.
- [ ] **Step 6: Run the checks.** `npm test -- --run src/features/backfill` must PASS, and `npm run lint && npm run typecheck` must be clean.
- [ ] **Step 7: Commit** with the message `feat: add Wayback Machine backfill runner`.

### Task 4: Read-only export endpoint

**Files:**
- Modify: `src/db/repository.ts`
- Create: `src/app/api/internal/export/route.ts`
- Test: `src/db/repository.test.ts`, `src/app/api/internal/export/route.test.ts`

**Interfaces:**
- Consumes: provenance columns (Task 1), `isAuthorized` (existing).
- Produces:
  - `type ExportedEdition = ParsedEdition & { origin: EditionOrigin; snapshotUrl: string | null; fetchedAt: string; parserVersion: number; contentHash: string }`. `fetchedAt` is an ISO string.
  - `FortuneRepository.listEditions(from: string, to: string): Promise<ExportedEdition[]>`. It returns editions with `from <= edition_date <= to`, ordered by source then date, with fortunes ordered by rank.
  - `createGetHandler(deps: { listEditions: (from: string, to: string) => Promise<ExportedEdition[]>; secret: string })`, plus `GET`.
  - The response is `{ from, to, editions }` with `Cache-Control: no-store`.
  - The route sets `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.

- [ ] **Step 1: Write failing tests.**
  - `listEditions`: save editions for 2026-10-01 (gogo, wayback) and 2026-10-05 (ohaasa). Then `listEditions("2026-10-01", "2026-10-03")` returns 1 edition with 12 fortunes, `origin: "wayback"`, and the snapshot URL.
  - Route returns 401 with no `Authorization`, 401 with a wrong secret, and 200 with the secret, returning the injected editions.
  - Route returns 400 for `from=2026-13-01`, for `from > to`, for a span over 400 days, and for missing params.
- [ ] **Step 2: Run the tests and see them fail.**
  `npm test -- --run src/db/repository.test.ts src/app/api/internal/export` must FAIL.
- [ ] **Step 3: Implement** `listEditions` (two queries: editions in range, then entries for those ids), plus the handler and route. `GET` builds its deps from `getDb()` and `getIngestionEnv().INGEST_SECRET`.
- [ ] **Step 4: Run the checks.** The same test command must PASS, and lint and typecheck must be clean.
- [ ] **Step 5: Commit** with the message `feat: add protected read-only edition export`.

### Task 5: Private data repo and export workflow

**Files:**
- Create: `src/features/export/write-files.ts`, `scripts/write-export-files.ts`, `.github/workflows/export-data.yml`
- Modify: `docs/operations.md`
- Test: `src/features/export/write-files.test.ts`

**Interfaces:**
- Consumes: the `ExportedEdition` response shape (Task 4).
- Produces:
  - `editionFilePath(edition: { source: Source; editionDate: string }): string`, which returns `editions/<source>/<YYYY>/<editionDate>.json`.
  - `writeExportFiles(payload: { editions: ExportedEdition[] }, rootDir: string): Promise<{ written: number; unchanged: number }>`. File content is `JSON.stringify(edition, null, 2) + "\n"`. It skips files whose content is identical.

- [ ] **Step 1: Write failing tests.** Use a temp dir from `fs.mkdtemp`.
  - `editionFilePath({ source: "gogo", editionDate: "2026-10-26" })` returns `"editions/gogo/2026/2026-10-26.json"`.
  - The first write gives `{ written: 2, unchanged: 0 }`; the same payload again gives `{ written: 0, unchanged: 2 }`.
  - With `vi.spyOn(console, "log")`, an edition whose comment is `"Invented hidden prose"` never appears in any console call.
- [ ] **Step 2: Run the tests and see them fail.** `npm test -- --run src/features/export` must FAIL.
- [ ] **Step 3: Implement** `write-files.ts`, and `scripts/write-export-files.ts <exportJsonPath> <dataRepoDir>`, which prints only `written=<n> unchanged=<m>`.
- [ ] **Step 4: Create `.github/workflows/export-data.yml`.**
  - Triggers: `schedule: - cron: "30 0 * * *"` (09:30 JST), and `workflow_dispatch` with optional inputs `from` and `to`.
  - Steps:
    1. Check out this repo. Set up node 22. Run `npm ci`.
    2. Check out the data repo with `actions/checkout@v4`: `repository: oohasa-graph/Oohaasa-graph-data`, `ssh-key: ${{ secrets.DATA_REPO_DEPLOY_KEY }}`, `path: data-repo`.
    3. Compute dates. `TO` defaults to the JST date (`TZ=Asia/Tokyo date +%F`). `FROM` defaults to `TO` minus 13 days.
    4. Split `FROM..TO` into chunks of at most 366 days. For each chunk, run `curl --fail --silent --show-error -H "Authorization: Bearer $INGEST_SECRET" -o "$RUNNER_TEMP/export.json" "${INGEST_URL%/ingest}/export?from=$A&to=$B"`, then `npx tsx scripts/write-export-files.ts "$RUNNER_TEMP/export.json" data-repo`.
    5. In `data-repo`: set the git user to `oohaasa-graph-bot` and run `git add -A editions`. If `git diff --cached --quiet`, print `no changes`. Otherwise run `git commit -m "data: export $FROM..$TO"` and `git push`.
  - Never `cat` export files, and never run `git diff`/`git show` without `--quiet`.
- [ ] **Step 5: Do the one-time GitHub setup.** The agent has org admin. All key files live in the session scratchpad and are deleted at the end.
  1. `gh repo create oohasa-graph/Oohaasa-graph-data --private --add-readme --description "Private mirror of Oohaasa and Gogo editions"`
  2. `ssh-keygen -t ed25519 -N "" -C oohaasa-graph-export -f <scratchpad>/data_repo_key`
  3. `gh repo deploy-key add <scratchpad>/data_repo_key.pub --repo oohasa-graph/Oohaasa-graph-data --allow-write --title "export from Oohaasa-graph"`
  4. `gh secret set DATA_REPO_DEPLOY_KEY --repo oohasa-graph/Oohaasa-graph < <scratchpad>/data_repo_key`
  5. `rm <scratchpad>/data_repo_key <scratchpad>/data_repo_key.pub`
  6. Verify: `gh repo view oohasa-graph/Oohaasa-graph-data --json visibility` must show `PRIVATE`, and `gh secret list --repo oohasa-graph/Oohaasa-graph` must list `DATA_REPO_DEPLOY_KEY`.
- [ ] **Step 6: Update `docs/operations.md`.** Add a "Private data mirror" section covering schedule, manual full export with `from=2021-01-01`, and the deploy key rotation commands. Add a "Wayback backfill" section covering how to dispatch it, the expected counts, and that the logs show statuses only. Add a "Migrations" section: they run in the Vercel production build, and must be additive.
- [ ] **Step 7: Run the checks.** `npm test -- --run src/features/export` must PASS, and lint and typecheck must be clean.
- [ ] **Step 8: Commit** with the message `feat: mirror editions to the private data repository`.

## Phase B: Read model

### Task 6: Market read model on an expected-morning axis

**Files:**
- Create: `src/features/market/types.ts`, `src/features/market/series.ts`, `src/features/market/queries.ts`, `src/features/market/load-data.ts`, `src/test/fixtures/market-fixture.ts`
- Test: `src/features/market/series.test.ts`, `src/features/market/queries.test.ts`

**Interfaces:**
- Consumes: `isSourceExpected`, `getJstDate`, `createTestRepository` (with `db`).
- Produces, in `types.ts`:
  - `MARKET_RANGES = ["1w", "1m", "3m", "all"] as const`
  - `type MarketRange`
  - `RANGE_DAYS = { "1w": 7, "1m": 30, "3m": 91 } as const`
  - `type RankSeries = { dates: string[]; ranks: Record<ZodiacCode, (number | null)[]> }`
  - `type MarketEdition = { source: Source; editionDate: string; entries: ParsedFortune[] }`
  - `type MarketSourceData = { latest: MarketEdition | null; series: RankSeries }`
  - `type MarketData = { generatedAt: string; currentDate: string; sources: Record<Source, MarketSourceData> }`
- Produces, in `series.ts`:
  - `expectedMornings(source: Source, startDate: string, endDate: string): string[]`
  - `buildSeries(source: Source, startDate: string, endDate: string, points: { date: string; zodiacCode: ZodiacCode; rank: number }[]): RankSeries`
- Produces, in `queries.ts`: `getMarketData(options: { db?: …; generatedAt?: Date; currentDate?: string }): Promise<MarketData>`. Per source:
  - `startDate = min(earliest stored edition date, currentDate − 90 days)`.
  - The history query selects only `editionDate`, `zodiacCode`, and `rank`; no text columns.
  - `latest` holds the full entries of the newest edition.
- Produces, in `load-data.ts`: `loadMarketData({ generatedAt?: Date }): Promise<MarketData>`. When `DATA_FIXTURE_MODE === "1"` it returns `marketFixture`, and it throws in production, as the current loader does.
- Produces, in the fixture:
  - `marketFixture: MarketData`: deterministic, `currentDate "2026-10-26"`, 120 days back, invented text. Ohaasa is missing `2026-10-14` and `2026-10-15`; Gogo is missing `2026-10-20`.
  - `emptyMarketFixture: MarketData`: no editions at all.

- [ ] **Step 1: Write failing `series.test.ts`.**
  - `expectedMornings("ohaasa", "2026-10-23", "2026-10-27")` returns `["2026-10-23", "2026-10-26", "2026-10-27"]`.
  - `expectedMornings("gogo", same)` has 5 dates.
  - `expectedMornings("ohaasa", "2026-11-02", "2026-11-04")` excludes `"2026-11-03"` (Culture Day).
  - `buildSeries` places ranks at their dates, uses `null` for missing dates, and ignores points on non-expected dates.
- [ ] **Step 2: Write failing `queries.test.ts`** using PGlite.
  - Save Ohaasa editions for `2026-10-23` and `2026-10-26`. Then `getMarketData({ db, currentDate: "2026-10-26" })`:
    - `sources.ohaasa.series.dates[0] === "2026-07-28"`
    - The libra values at those two dates are non-null; `2026-10-21` is `null`.
    - `latest.editionDate === "2026-10-26"` with 12 entries.
  - With an extra Ohaasa edition on `2021-06-01`, `dates[0] === "2021-06-01"`.
  - With no Gogo editions, `sources.gogo.latest === null` and every value in `series.ranks` is `null`.
- [ ] **Step 3: Run the tests and see them fail.** `npm test -- --run src/features/market` must FAIL.
- [ ] **Step 4: Implement** the types, series, queries, loader, and fixture so the tests pass. The fixture's generator follows the prototype's seeded `gen()`.
- [ ] **Step 5: Run the checks.** The tests must PASS, and lint and typecheck must be clean.
- [ ] **Step 6: Commit** with the message `feat: add market history read model with honest gaps`.

### Task 7: Market metrics

**Files:**
- Create: `src/features/market/metrics.ts`
- Test: `src/features/market/metrics.test.ts`

**Interfaces:**
- Consumes: `RankSeries`, `MarketRange`, and `RANGE_DAYS` (Task 6).
- Produces:
  - `sliceSeries(series: RankSeries, range: MarketRange, currentDate: string): RankSeries`. It keeps dates after `currentDate − RANGE_DAYS[range]` days; `"all"` returns the whole series.
  - `rangeStats(values: (number | null)[]): { average: number | null; best: number | null; worst: number | null; ones: number; topThree: number; volatility: number | null; covered: number; expected: number }`. Volatility is the population standard deviation, `null` when `covered < 2`.
  - `dailyChange(values: (number | null)[]): number | null`. It returns previous minus last, so positive means improved; `null` if either of the last two values is `null`.
  - `currentTopThreeStreak(values: (number | null)[]): number`. It counts back from the end; a `null` ends the streak.
  - `topMovers(series: RankSeries, direction: "gainers" | "losers", limit?: number): { zodiacCode: ZodiacCode; change: number; previousRank: number; rank: number }[]`. Default limit is 4. Gainers have `change > 0`, sorted descending; losers have `change < 0`, sorted ascending. Ties follow `ZODIAC_CODES` order.
  - `hotStreaks(series: RankSeries, limit?: number): { zodiacCode: ZodiacCode; days: number }[]`. Only `days > 0`, sorted descending, default limit 4.
  - `weeklyAwards(series: RankSeries, currentDate: string): Record<"mvp" | "cheer" | "king" | "steady", { zodiacCode: ZodiacCode; value: number } | null>`. Each award follows spec §5.4:
    - `mvp` and `cheer`: compare the mean of non-null values in the last 5 expected mornings with the 5 before. Skip a sign if either window is empty. A positive improvement (for mvp) or drop (for cheer) is required, otherwise `null`.
    - `king`: the most #1 mornings in the last 91 days; at least 1 is required.
    - `steady`: the lowest average over the last 91 days among signs with `covered >= 5`.
  - `moodFor(rank: number | null): "star" | "happy" | "calm" | "sad"`: 1 is star, 2–3 happy, 4–9 or `null` calm, 10–12 sad.
  - `moodLineIndex(rank: number | null): 0 | 1 | 2 | 3 | 4 | 5`, by bucket: 1 → 0, 2–3 → 1, 4–6 (and `null`) → 2, 7–9 → 3, 10–11 → 4, 12 → 5.
  - `stampColor(rank: number | null): string`, using the prototype formula:
    - 1 → `#ff6f91`
    - otherwise, with `t = (rank − 1) / 11`: if `t < 0.5`, `hsla(345,95%,74%,${(1−2t)·0.9+0.1})`; else `hsla(215,70%,72%,${(t−0.5)·2·0.9+0.1})`
    - `null` → `"transparent"`

- [ ] **Step 1: Write failing tests** with these exact values:
  - `rangeStats([1, null, 3, 5])` gives `{ average: 3, best: 1, worst: 5, ones: 1, topThree: 2, covered: 3, expected: 4 }`, and volatility `toBeCloseTo(1.633, 3)`.
  - `rangeStats([null, null])` gives `average: null` and `volatility: null`.
  - `dailyChange([5, 2])` is `3`; `[5, null]` and `[null, 4]` are `null`; `[7]` is `null`.
  - `currentTopThreeStreak`: `[4, 2, 1, 3]` is `3`; `[2, null, 1]` is `1`; `[1, 2, null]` is `0`.
  - `moodFor`: `1` is `"star"`, `3` is `"happy"`, `9` is `"calm"`, `10` is `"sad"`, `null` is `"calm"`.
  - `moodLineIndex`: `1→0`, `2→1`, `6→2`, `7→3`, `11→4`, `12→5`.
  - `sliceSeries(<series dated 2026-10-10..2026-10-26>, "1w", "2026-10-26").dates[0] === "2026-10-20"`.
  - `weeklyAwards` on a crafted 10-morning series where aries goes from 10 to 2 and taurus from 2 to 11: `mvp.zodiacCode === "aries"` and `cheer.zodiacCode === "taurus"`. On all-null data, every award is `null`.
  - `stampColor(1) === "#ff6f91"`, and `stampColor(null) === "transparent"`.
- [ ] **Step 2: Run the tests and see them fail.** `npm test -- --run src/features/market/metrics.test.ts` must FAIL.
- [ ] **Step 3: Implement** `metrics.ts`.
- [ ] **Step 4: Run the checks.** The tests must PASS, and lint and typecheck must be clean.
- [ ] **Step 5: Commit** with the message `feat: add market metrics, awards, and moods`.

## Phase C: Kawaii UI

### Task 8: Languages and sign metadata

**Files:**
- Create: `src/features/market/i18n.ts`, `src/features/market/signs.ts`, `src/features/market/language.ts`
- Test: `src/features/market/i18n.test.ts`, `src/features/market/language.test.ts`

**Interfaces:**
- Produces, in `i18n.ts`:
  - `LANGUAGES = ["ja", "en", "ko"] as const`, `type Language`, `DEFAULT_LANGUAGE = "ja"`.
  - `messages: Record<Language, Messages>`.
  - `formatRank(lang: Language, rank: number | string): string`
  - `sourceName(lang: Language, source: Source): string`
  - `rangeLabel(lang: Language, range: MarketRange): string`
  - `flavor(lang: Language, key: MessageKey): string`: English upper-case under Japanese; Japanese under English and Korean.
  - `moodLine(lang: Language, index: 0 | 1 | 2 | 3 | 4 | 5): string`.
- **Message keys and values** are the prototype's `T` dictionary verbatim, plus the keys below.
  - Prototype keys: `brandA`, `brandC`, `watch`, `chart`, `gainers`, `losers`, `streaks`, `race`, `stampcal`, `thSign`, `thRank`, `thChg`, `thHiLo`, `vsYesterday`, `avg`, `best`, `ones`, `swing`, `hint`, `back`, `main`, `board`, `sameSign`, `starDay`, `higher`, `noStreak`, `mvp`, `cheer`, `king`, `chip`, `vsLastWeek`, `ones3m`, `avg3m`, `close`, `raceHint`, `calHint`, `top`, `middle`, `bottom`, and the `mood` lines.

  | Key | ja | en | ko |
  |---|---|---|---|
  | `fortune` | 今日の運勢 | Today's fortune | 오늘의 운세 |
  | `luckyHint` | ラッキーアイテム | Lucky item | 행운의 아이템 |
  | `luckyColor` | ラッキーカラー | Lucky color | 행운의 색 |
  | `luckyKey` | 幸運のカギ | Lucky key | 행운의 열쇠 |
  | `scoreMoney` | 金運 | Money | 금전운 |
  | `scoreLove` | 恋愛運 | Love | 연애운 |
  | `scoreWork` | 仕事運 | Work | 업무운 |
  | `scoreHealth` | 健康運 | Health | 건강운 |
  | `noData` | まだデータがありません | No data yet | 아직 데이터가 없어요 |
  | `langTitle` | ことばをえらんでね | Choose your language | 언어를 골라 주세요 |
  | `langNote` | あとで上のバーから変えられます | Change it anytime from the top bar | 상단 바에서 언제든 바꿀 수 있어요 |
  | `languageButton` | 日本語 | English | 한국어 |

  Function-valued keys:

  | Key | ja | en | ko |
  |---|---|---|---|
  | `coverage(covered, expected)` | `${c}/${e}朝` | `${c}/${e} mornings` | `${c}/${e} 아침` |
  | `stale(date)` | `${date}（JST）のデータ` | `Data from ${date} JST` | `${date}(JST) 데이터` |
  | `times(n)` | `${n}回` | `${n}×` | `${n}회` |
  | `streakDays(n)` | `${n}日連続 ✦` | `${n} days in a row ✦` | `${n}일 연속 ✦` |

  Range labels:

  | Range | ja | en | ko |
  |---|---|---|---|
  | `1w` | 1週 | 1W | 1주 |
  | `1m` | 1か月 | 1M | 1개월 |
  | `3m` | 3か月 | 3M | 3개월 |
  | `all` | ぜんぶ | ALL | 전체 |

  Source names: Ohaasa is おはあさ / Ohaasa / 오하아사; Gogo is ゴーゴー / Gogo / 고고.
- Produces, in `signs.ts`: `SIGN_META: Record<ZodiacCode, { ticker: string; glyph: string; hue: number; names: Record<Language, string> }>`.
  - `ticker`: ARI, TAU, GEM, CAN, LEO, VIR, LIB, SCO, SAG, CAP, AQU, PIS.
  - `glyph`: ♈︎…♓︎, with `︎`.
  - `hue`: `index × 30`.
  - `names`: Japanese and Korean from the prototype; English names capitalized.
  - Also `lineColor(code)`, which is `hsl(h 70% 64%)`; `pastelColor(code)`, which is `hsl(h 92% 87%)`; and `signName(lang, code)`.
- Produces, in `language.ts`:
  - `LANGUAGE_COOKIE = "rm-lang"`
  - `parseLanguage(value: string | undefined): Language` (default `"ja"`)
  - `languageCookieString(lang: Language): string`, which returns `` `rm-lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax` ``
  - `sanitizeReturnPath(value: string | null | undefined): string`. It returns the value only if it starts with `/`, does not start with `//`, and contains no `\`; otherwise `"/"`.

- [ ] **Step 1: Write failing tests.**
  - For every key of `messages.ja`, the en and ko entries exist and are non-empty. Function-valued keys are called with sample arguments.
  - `formatRank("en", 3) === "#3"`, `formatRank("ja", 3) === "3位"`, `formatRank("ko", 3) === "3위"`.
  - `ZODIAC_CODES.map((c) => signName("ko", c))` equals `["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "궁수자리", "염소자리", "물병자리", "물고기자리"]`.
  - `parseLanguage("fr") === "ja"`; `parseLanguage("ko") === "ko"`.
  - `sanitizeReturnPath` returns `"/"` for `"//evil.com"`, `"https://evil.com"`, `"/\\evil"`, and `undefined`, and returns `"/board?sign=leo"` unchanged.
- [ ] **Step 2: Run the tests and see them fail.** `npm test -- --run src/features/market/i18n.test.ts src/features/market/language.test.ts` must FAIL.
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run the checks.** The tests must PASS, and lint and typecheck must be clean.
- [ ] **Step 5: Commit** with the message `feat: add Japanese, English, and Korean market copy`.

### Task 9: Visual foundation (fonts, tokens, mochi, chart geometry)

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/features/market/components/mochi.tsx`, `src/features/market/chart-geometry.ts`, `src/features/market/use-element-width.ts`, `src/features/market/market.module.css`
- Test: `src/features/market/components/mochi.test.tsx`, `src/features/market/chart-geometry.test.ts`

**Interfaces:**
- Consumes: `moodFor` (Task 7), `pastelColor` and `SIGN_META` (Task 8), `parseLanguage` and `LANGUAGE_COOKIE` (Task 8).
- Produces:
  - `<Mochi sign={ZodiacCode} rank={number | null} size={number} label?={string} />`. It uses the prototype's SVG geometry (`viewBox="0 0 60 56"`, body path, cheeks, faint glyph, faces per mood, crown and sparkle for star, sweat drop for sad), with a `data-mood` attribute on the root `<svg>`. It is `aria-hidden` unless `label` is given.
  - `scaleRank(rank: number, top: number, height: number): number`: rank 1 maps to `top`, rank 12 to `top + height`.
  - `xForIndex(index: number, count: number, left: number, width: number): number`: a single point is centered.
  - `linePaths(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string[]`: one `M…L…` path per run of non-null values; an isolated value gives `"M x,y"`.
  - `pickTicks(count: number, ticks: number): number[]`: indices `Math.round(k·(count−1)/(ticks−1))`, unique.
  - `useElementWidth(ref: RefObject<HTMLElement | null>, fallback: number): number`, using ResizeObserver.
- Fonts (`next/font/google`):
  - `Zen_Maru_Gothic` (weights 500, 700, 900; `preload: false`; variable `--font-maru`)
  - `Jua` (400; variable `--font-ko-heading`), for Korean headings and bold text
  - `Gowun_Dodum` (400; variable `--font-ko-body`)
- Layout: `RootLayout` is async. It reads `parseLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value)` and sets `<html lang>`. Metadata title is `うらない証券取引所 · Rank Market`.

- [ ] **Step 1: Write failing tests.**
  - `linePaths([1, 2, null, 3, null, null, 4, 5], i => i, v => v)` has length 3, and its second element is `"M3,3"`.
  - `linePaths([null, null], …)` is `[]`.
  - `pickTicks(60, 5)` equals `[0, 15, 30, 44, 59]`; `pickTicks(1, 5)` equals `[0]`.
  - `scaleRank(1, 10, 110) === 10` and `scaleRank(12, 10, 110) === 120`.
  - `render(<Mochi sign="aries" rank={1} size={40} />)` gives an svg with `data-mood="star"`. `rank={12}` gives `"sad"`. `rank={null}` gives `"calm"`.
- [ ] **Step 2: Run the tests and see them fail.**
  `npm test -- --run src/features/market/chart-geometry.test.ts src/features/market/components/mochi.test.tsx` must FAIL.
- [ ] **Step 3: Implement** the modules.
  - `globals.css` takes the prototype's `:root` tokens: `--ink #4b3a34`, `--soft #9a8479`, `--line #f0e2d6`, `--cream #fff8ee`, `--card #fffdf9`, `--pink #ff8fab`, `--pinkbg #ffe3ea`, `--sky #6aa8e8`, `--skybg #e3f0ff`, `--butter #ffd34d`, `--hanko #e2504c`.
  - Also the polka-dot body background, and the body font `var(--font-maru)`. Under `html:lang(ko)`, headings, `b`, and `strong` use `var(--font-ko-heading)` and the body uses `var(--font-ko-body)`.
  - `market.module.css` carries the shared card, pill, badge, hanko, and chip styles from the prototype.
- [ ] **Step 4: Run the checks.** The tests must PASS; lint, typecheck, and `npm run build` must be clean.
- [ ] **Step 5: Commit** with the message `feat: add kawaii visual foundation and mochi characters`.

### Task 10: Main page view

**Files:**
- Create: `src/features/market/market-params.ts`, `src/features/market/use-market-state.ts`, and in `src/features/market/components/`: `top-bar.tsx`, `controls.tsx`, `ticker.tsx`, `watchlist.tsx`, `rank-chart.tsx`, `range-stats.tsx`, `fortune-card.tsx`, `movers.tsx`, `main-view.tsx`
- Test: `src/features/market/market-params.test.ts`, `src/features/market/components/main-view.test.tsx`

**Interfaces:**
- Consumes: Tasks 6–9.
- Produces:
  - `type MarketState = { sign: ZodiacCode; source: Source; range: MarketRange }`
  - `parseMarketParams(params: Record<string, string | string[] | undefined>): MarketState`: defaults are libra, ohaasa, `1m`; for an array value, the first element is used.
  - `marketQuery(state: MarketState): string`, which returns `?sign=<sign>&source=<source>&range=<range>`.
  - `useMarketState(initial: MarketState): [MarketState, (patch: Partial<MarketState>) => void]`. It updates state and calls `window.history.replaceState(null, "", location.pathname + marketQuery(next))`, with no server round trip.
  - `<TopBar lang current="main" | "board" returnPath={string} />`: breadcrumb plus a language `Link` to `/language?return=${encodeURIComponent(returnPath)}`, labelled `あ/A ${messages[lang].languageButton} ▾`.
  - `<MainView data={MarketData} initial={MarketState} lang={Language} />` (`"use client"`).
- Behavior is spec §5.3:
  - **Header:** brand (`brandA` with `flavor`), a JST clock (`HH:MM JST`, refreshed every 15 s, rendered only after mount to avoid a hydration mismatch), and the source and range pills.
  - **Section headings:** every card heading renders `messages[lang][key]` followed by a small `flavor(lang, key)` label.
  - **Ticker:** CSS marquee with duplicated content. Respect `prefers-reduced-motion` by not animating.
  - **Watchlist:** sorted by latest rank, with signs that have no latest rank last. Clicking a row sets `sign`. Under 480 px, hide the best/worst column.
  - **Rank chart:** a `Link` to `/board${marketQuery(state)}`, with `aria-label` set to the hint text.
    - It draws at `useElementWidth` width. Height is 280 at 720 px and wider, 220 below.
    - The selected source is drawn with `linePaths` in `lineColor`. The other source is a dotted line. A ★ goes at each rank-1 point. Y ticks are 1, 3, 6, 9, 12 via `formatRank`; x ticks come from `pickTicks(n, 6)`.
  - **Hero:** the mochi at 92 px, the speech bubble `moodLine(moodLineIndex(latest rank))`, and the change pill from `dailyChange`, where `null` renders `−`.
  - **Range stats:** a coverage line (`messages.coverage`) appears under the stats.
  - **Fortune card:**
    - Ohaasa shows `comment` and `luckyHint`.
    - Gogo shows `comment`, `luckyColor`, `luckyKey`, the four scores as rows of small filled hearts (filled count = score, out of 5), and winner categories as hanko badges.
    - If there is no latest edition, show `noData`.
  - **Stale data:** when `latest.editionDate !== data.currentDate`, show `messages.stale(latest.editionDate)` in the header.
  - **Bottom row:** `topMovers` and `hotStreaks`; clicking an entry selects that sign.

- [ ] **Step 1: Write failing tests.**
  - `parseMarketParams({ sign: "leo", source: "gogo", range: "all" })` returns the same values.
  - `parseMarketParams({ sign: "x", source: "y", range: "10y" })` returns `{ sign: "libra", source: "ohaasa", range: "1m" }`.
  - `parseMarketParams({ sign: ["leo", "aries"] })` gives `sign: "leo"`.
  - `marketQuery({ sign: "leo", source: "gogo", range: "3m" }) === "?sign=leo&source=gogo&range=3m"`.
  - `main-view.test.tsx` with `marketFixture`, `lang="ja"`:
    - Headings `今日の銘柄`, `順位チャート`, `急上昇 ↗`, and `今日の運勢` are visible.
    - Clicking the watchlist row named `しし座` updates the hero name to `しし座` and makes `window.location.search` contain `sign=leo`.
    - The chart link's href equals `/board?sign=libra&source=ohaasa&range=1m`.
  - With `lang="en"`, the watchlist shows ranks as `#1` badges and the heading `Today's board`.
  - With `emptyMarketFixture`, `noData` text is shown, and `document.body.textContent` contains neither `NaN` nor `Infinity`.
- [ ] **Step 2: Run the tests and see them fail.**
  `npm test -- --run src/features/market/market-params.test.ts src/features/market/components/main-view.test.tsx` must FAIL.
- [ ] **Step 3: Implement** the components to match the prototype's main view (CSS from the prototype's `/* A: cute terminal */` block, moved into `market.module.css`).
- [ ] **Step 4: Run the checks.** The tests must PASS, and lint and typecheck must be clean.
- [ ] **Step 5: Commit** with the message `feat: build the kawaii main market page`.

### Task 11: Market board view

**Files:**
- Create in `src/features/market/components/`: `award-cards.tsx`, `rank-race.tsx`, `stamp-calendar.tsx`, `board-view.tsx`
- Test: `src/features/market/components/board-view.test.tsx`

**Interfaces:**
- Consumes: Tasks 6–10 (`weeklyAwards`, `stampColor`, `linePaths`, `Mochi`, `TopBar`, `useMarketState`, `marketQuery`).
- Produces: `<BoardView data={MarketData} initial={MarketState} lang={Language} />` (`"use client"`).
- Behavior is spec §5.4 plus §5.8:
  - **Back:** `Link` to `/${marketQuery(state)}` labelled `messages.back`.
  - **Award cards:** hanko labels `mvp`, `cheer`, `king`, `chip`; a `null` award renders a muted card with `noData`. Two per row under 720 px.
  - **Rank race:**
    - Draws at the measured width, height 380 (340 under 720 px).
    - Other signs have opacity 0.35 and width 2.4; the selected sign is drawn last with width 5.
    - End-of-line `Mochi` faces are 34 px selected and 24 px otherwise (20 under 720 px). Faces are clickable.
    - Legend chips are `button`s with `aria-pressed`. Under 720 px they sit in one row with `overflow-x: auto` and `flex-wrap: nowrap`.
  - **Stamp calendar:**
    - Always the last 91 days, `sliceSeries(…, "3m")`.
    - The grid is inside an `overflow-x: auto` wrapper, with a `position: sticky; left: 0` label column. Stamps are 12 px with a 3 px gap below 720 px; on desktop they fill the width with a 7 px minimum.
    - On mount, `scrollLeft = scrollWidth`.
    - `null` renders an empty outlined stamp. ★ marks rank 1. Each stamp has a `title` of `${signName} · ${date} · ${formatRank}`.

- [ ] **Step 1: Write failing tests** with `marketFixture`, `lang="ja"`:
  - The hanko texts `今週のMVP`, `がんばれ賞`, `1位王`, and `安定株` are visible.
  - Clicking the legend chip `しし座` sets its `aria-pressed="true"` and `window.location.search` contains `sign=leo`.
  - The stamp row for libra (Ohaasa) has exactly `expectedMornings("ohaasa", "2026-07-28", "2026-10-26").length` stamps, and the `2026-10-14` stamp is empty.
  - The back link's href is `/?sign=libra&source=ohaasa&range=1m`.
  - With `emptyMarketFixture`, the page contains no `NaN`.
- [ ] **Step 2: Run the tests and see them fail.** `npm test -- --run src/features/market/components/board-view.test.tsx` must FAIL.
- [ ] **Step 3: Implement** the components, with CSS from the prototype's `/* C: cute board */` block plus the phone rules above.
- [ ] **Step 4: Run the checks.** The tests must PASS, and lint and typecheck must be clean.
- [ ] **Step 5: Commit** with the message `feat: build the kawaii market board`.

### Task 12: Routes, language page, and removal of the old UI

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/board/page.tsx`, `src/app/language/page.tsx`, `src/features/market/components/language-view.tsx`
- Delete: `src/features/rank-market/` (whole folder), `src/test/fixtures/rank-market-fixture.ts`, `src/test/fixtures/dashboard-data.ts` (after confirming no imports remain)
- Test: `src/features/market/components/language-view.test.tsx`

**Interfaces:**
- Consumes: `loadMarketData`, `parseMarketParams`, `parseLanguage`, `sanitizeReturnPath`, `languageCookieString`, `MainView`, `BoardView`.
- Produces:
  - `/` and `/board` are `async` pages with `export const dynamic = "force-dynamic"`. Each does `const params = await searchParams`, gets the language with `parseLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value)`, loads data with `await loadMarketData()`, and renders `<MainView>` or `<BoardView>`.
  - `/language` reads the `return` param through `sanitizeReturnPath` and renders `<LanguageView lang returnPath />`.
  - `<LanguageView>` is a client component: three big buttons (English / 日本語 / 한국어 with greetings Hello! / こんにちは！ / 안녕하세요!), the current one highlighted (`aria-current="true"`), three bobbing mochi (no animation under `prefers-reduced-motion`), and a back `Link` to `returnPath`. On click, it sets `document.cookie = languageCookieString(lang)`, then calls `router.replace(returnPath)` and `router.refresh()`.

- [ ] **Step 1: Write a failing `language-view.test.tsx`.** Mock `next/navigation`'s `useRouter` to return `{ replace, refresh }`. Clicking `한국어` makes `document.cookie` contain `rm-lang=ko` and calls `replace` with `"/board?sign=leo"` (given `returnPath="/board?sign=leo"`).
- [ ] **Step 2: Run the test and see it fail.** `npm test -- --run src/features/market/components/language-view.test.tsx` must FAIL.
- [ ] **Step 3: Implement** the pages and `LanguageView`. Then delete the old rank-market UI and its fixtures.
  - `grep -rn "rank-market\|dashboard-data" src tests` must print nothing.
  - `src/app/(private)` must still compile. If it imports old components, point it at `MainView`.
- [ ] **Step 4: Run the checks.** `npm run lint && npm run typecheck && npm test && npm run build` must all pass.
- [ ] **Step 5: Commit** with the message `feat: route main, board, and language pages to the new market UI`.

### Task 13: End-to-end and phone checks

**Files:**
- Delete: `tests/private-rank-market.spec.ts`
- Create: `tests/market.spec.ts`

**Interfaces:**
- Consumes: the routes from Task 12, `marketFixture` via `DATA_FIXTURE_MODE=1`, and the existing Playwright config (desktop and mobile projects).

- [ ] **Step 1: Write `tests/market.spec.ts`.** Each test collects `page.on("pageerror")` and asserts the list is empty at the end.
  1. `first visit opens the Japanese main page`: `/` shows heading `今日の銘柄`, and `html` has `lang="ja"`.
  2. `chart opens the board and back returns`: clicking the link labelled `タップで市場ボードへ ↗` goes to URL `/board?sign=libra&source=ohaasa&range=1m` with heading `順位レース` visible. `page.goBack()` then shows heading `今日の銘柄`.
  3. `selection carries into the board`: click watchlist `しし座`, click `3か月`, then click the chart link. The URL contains `sign=leo` and `range=3m`, and chip `しし座` has `aria-pressed="true"`.
  4. `language page switches to Korean and remembers it`: click the `あ/A 日本語 ▾` link, then `한국어`. The URL is back to `/?…`, heading `오늘의 종목` is visible, and after `page.reload()` it is still visible.
  5. `no horizontal page scroll on phones`, run only when `testInfo.project.name === "mobile-chromium"`: for `/`, `/board`, and `/language`, `await page.evaluate(() => document.documentElement.scrollWidth)` is `<=` `page.viewportSize()!.width`. On `/board`, the stamp calendar scroller's `scrollLeft` is `> 0`.
- [ ] **Step 2: Run** `npm run test:e2e`. Both projects must pass.
- [ ] **Step 3: Commit** with the message `test: cover market flows, languages, and phone layout end to end`.

## Phase D: Rollout

### Task 14: Deploy, backfill, mirror, and verify live

No new files. Every step is a command with an expected result.

- [ ] **Step 1: Run the local checks.** `npm run lint && npm run typecheck && npm test && npm run build` must all pass.
- [ ] **Step 2: Push and wait.**
  1. Run `git push origin HEAD`.
  2. Wait for the CI run on the pushed SHA to reach `success`: `gh run list --workflow CI --limit 1 --json conclusion,headSha`.
  3. Wait for the Vercel commit status to be `success`: `gh api repos/oohasa-graph/Oohaasa-graph/commits/<sha>/status --jq .state`.
  4. If the Vercel status is `failure`, the migration or build failed. Stop and report; the old deployment is still serving.
- [ ] **Step 3: Check that the daily ingest still works.** Dispatch `ingest.yml` with `source=all force=false`. Expected: the run concludes `success`, and both sources report `already_complete` or `success`.
- [ ] **Step 4: Backfill a small window first.** Dispatch `backfill.yml` with `source=all from=2026-10-01 to=2026-10-25`. Expected: the run concludes `success`, and the totals line shows `success` > 0 with no POST failures.
- [ ] **Step 5: Run the full backfill.** Dispatch `backfill.yml` with `source=all from=2021-06-01 to=2026-09-30`. Expected: `success` near the spec's estimate (about 250 Gogo and about 115 Ohaasa mornings in total, including Step 4), and the counted `invalid` statuses are pre-layout or broken snapshots.
- [ ] **Step 6: Run a full export.** Dispatch `export-data.yml` with `from=2021-01-01`. Expected: `success`.
  - Check `gh api repos/oohasa-graph/Oohaasa-graph-data/commits --jq '.[0].commit.message'`; it starts with `data: export`.
  - Check `gh api "repos/oohasa-graph/Oohaasa-graph-data/contents/editions/gogo/2026/2026-10-26.json" --jq .content | base64 -d | jq '{origin, editionDate, n: (.fortunes|length)}'`; it prints `origin "live"` and `n 12`. Never print the whole file.
- [ ] **Step 7: Prove no leaks.** For the latest `ingest.yml`, `backfill.yml`, and `export-data.yml` runs: `gh run view <id> --log | grep -cP '[\x{3040}-\x{30ff}]'` must print `0` (no kana in public logs).
- [ ] **Step 8: Check the live site.**
  - `curl -s -o /dev/null -w '%{http_code}' https://oohaasa-graph.vercel.app/` and the same for `/board` and `/language` must each return `200`.
  - Run Playwright against production at 390×844 (system Chrome, `channel: "chrome"`): on `/` and `/board`, `scrollWidth` must be `<= 390`, and `/board` with `range=all` must show history lines.
- [ ] **Step 9: Report to the owner** with run links and counts. If no further code change is needed, there is nothing to commit.
