# Oohaasa/Gogo Fortune Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete private Next.js application that ingests Ohaasa and Gogo fortunes on schedule, archives validated history in Neon, and renders the approved market-style personal rank experience.

**Architecture:** A GitHub Actions workflow calls a bearer-protected Vercel route four times each Japanese morning. Source adapters normalize Ohaasa JSON and Gogo HTML, a validated idempotent service commits complete 12-sign editions to Postgres, and authenticated server queries provide source-specific rank-market data to the UI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, npm, Neon Postgres, Drizzle ORM, Cheerio, Recharts, NextAuth 4/Auth.js credentials, bcryptjs, Zod, Vitest, PGlite, Testing Library, Playwright, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-26-oohaasa-gogo-fortune-graph-design.md`

## Global Constraints

- The product remains a private prototype; fortune content must require authentication.
- Ohaasa uses only the normal weekday JSON feed and is not requested on Saturday, Sunday, or Japanese public holidays.
- Gogo is expected every calendar day.
- Do not fetch or display broadcaster images or logos.
- Do not implement combined ranks, probabilities, betting, money, or prediction-market behavior.
- Source dates are interpreted in `Asia/Tokyo`; stale source data is never relabeled as today.
- Every committed edition contains exactly 12 unique zodiac signs and ranks 1 through 12.
- Full source responses and fortune prose must not enter logs or failed-run records.
- Committed parser/UI fixtures use invented prose.
- Public release remains blocked pending rights review.

---

## Planned File Structure

```text
.github/workflows/ci.yml                         # continuous verification
.github/workflows/ingest.yml                     # UTC schedules and manual ingestion
.env.example                                     # required local/Vercel/GitHub configuration
README.md                                        # setup, scripts, private-prototype warning
docs/operations.md                               # ingestion and recovery runbook
drizzle.config.ts                                # migration generation configuration
drizzle/                                         # generated SQL migrations
next.config.ts                                   # Next.js configuration
package.json                                     # scripts and dependencies
playwright.config.ts                             # authenticated fixture-mode browser tests
vitest.config.ts                                 # unit/integration test configuration
src/app/api/auth/[...nextauth]/route.ts          # Auth.js route
src/app/api/internal/ingest/route.ts             # protected scheduled endpoint
src/app/login/login-form.tsx                    # client credentials sign-in form
src/app/login/page.tsx                           # private prototype login
src/app/(private)/layout.tsx                     # server-side authentication gate
src/app/(private)/page.tsx                       # server-loaded rank market
src/app/globals.css                              # base dark visual system
src/auth/auth-options.ts                         # stable NextAuth configuration
src/auth/credentials.ts                          # environment validation/password check
src/db/client.ts                                 # lazy Neon Drizzle client
src/db/repository.ts                             # edition/run persistence
src/db/schema.ts                                 # Postgres schema
src/features/fortune/domain.ts                   # canonical source/zodiac/edition types
src/features/fortune/errors.ts                   # typed stale/invalid/fetch failures
src/features/fortune/zodiac.ts                   # source-specific zodiac maps
src/features/fortune/parsers/ohaasa.ts           # Ohaasa JSON normalization
src/features/fortune/parsers/gogo.ts             # Gogo HTML normalization
src/features/fortune/validate-edition.ts         # cross-source invariants
src/features/ingestion/http.ts                   # bounded source requests
src/features/ingestion/request-auth.ts           # timing-safe bearer verification
src/features/ingestion/service.ts                # policy/idempotency/fetch/commit orchestration
src/features/ingestion/source-policy.ts          # JST and holiday eligibility
src/features/rank-market/queries.ts              # authenticated read model
src/features/rank-market/metrics.ts              # movement/streak/biggest-mover calculations
src/features/rank-market/rank-market.tsx         # global source/sign state
src/features/rank-market/rank-market.module.css  # approved market-inspired layout
src/features/rank-market/components/             # hero, toggles, race, chart, fortune cards
src/lib/env.ts                                    # server environment validation
src/lib/time/jst.ts                               # Tokyo date helpers
src/test/fixtures/                                # invented JSON/HTML/UI data
src/test/factories.ts                             # canonical invented edition factory
src/test/setup.ts                                 # DOM test setup
src/test/pglite.ts                                # migrated in-memory Postgres helper
src/test/                                         # colocated and integration tests
```

---

### Task 1: Project Foundation, Domain Types, and Source Policy

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/features/fortune/domain.ts`
- Create: `src/features/fortune/errors.ts`
- Create: `src/features/fortune/zodiac.ts`
- Create: `src/lib/time/jst.ts`
- Create: `src/features/ingestion/source-policy.ts`
- Test: `src/features/ingestion/source-policy.test.ts`
- Test: `src/lib/time/jst.test.ts`

**Interfaces:**
- Produces: `Source`, `ZodiacCode`, `ParsedFortune`, `ParsedEdition`, `IngestionAttempt`, `IngestionStatus`.
- Produces: `StaleSourceError`, `InvalidEditionError`, `SourceFetchError` with stable error codes and no source prose.
- Produces: `getJstDate(now: Date): string` and `isSourceExpected(source: Source, date: string): boolean`.
- Consumes: no project interfaces.

- [ ] **Step 1: Scaffold Next.js and install the complete dependency set**

Run:

```bash
tmp="$(mktemp -d)"
npx create-next-app@16.3.3 "$tmp/app" --typescript --eslint --app --src-dir --use-npm --no-tailwind --import-alias "@/*" --yes
cp -R "$tmp/app"/. .
rm -rf "$tmp"
npm install next-auth@4.24.15 bcryptjs@3.0.3 zod@latest cheerio@1.2.0 recharts@3.10.1 drizzle-orm@0.45.2 @neondatabase/serverless@1.1.0 @holiday-jp/holiday_jp@2.5.1 server-only
npm install -D drizzle-kit@0.31.10 vitest@4.1.11 jsdom@latest @testing-library/react@16.3.2 @testing-library/jest-dom@latest @testing-library/user-event@latest @playwright/test@1.62.1 @electric-sql/pglite@0.5.7 tsx@latest
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

Append `.superpowers/`, `.pi-subagents/`, and Playwright output directories to `.gitignore`. Set `.nvmrc` to `22`.

- [ ] **Step 2: Configure Vitest and write failing date/policy tests**

Create `vitest.config.ts` with `@/` resolution, the `jsdom` default environment, `src/test/setup.ts`, and an environment match that runs database tests in Node.

Write:

```ts
import { describe, expect, it } from "vitest";
import { getJstDate } from "@/lib/time/jst";

describe("getJstDate", () => {
  it("crosses into the next date at Japan midnight", () => {
    expect(getJstDate(new Date("2026-08-25T15:00:00Z"))).toBe("2026-08-26");
  });
});
```

```ts
import { describe, expect, it } from "vitest";
import { isSourceExpected } from "@/features/ingestion/source-policy";

describe("isSourceExpected", () => {
  it("accepts Ohaasa on an ordinary weekday", () => {
    expect(isSourceExpected("ohaasa", "2026-08-12")).toBe(true);
  });

  it("rejects Ohaasa on weekends and Mountain Day", () => {
    expect(isSourceExpected("ohaasa", "2026-08-15")).toBe(false);
    expect(isSourceExpected("ohaasa", "2026-08-11")).toBe(false);
  });

  it("expects Gogo every day", () => {
    expect(isSourceExpected("gogo", "2026-08-15")).toBe(true);
    expect(isSourceExpected("gogo", "2026-08-11")).toBe(true);
  });
});
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```bash
npm test -- src/lib/time/jst.test.ts src/features/ingestion/source-policy.test.ts
```

Expected: FAIL because `getJstDate` and `isSourceExpected` do not exist.

- [ ] **Step 4: Implement the canonical domain and policies**

Define the exact canonical types in `src/features/fortune/domain.ts`:

```ts
export const SOURCES = ["ohaasa", "gogo"] as const;
export type Source = (typeof SOURCES)[number];

export const ZODIAC_CODES = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;
export type ZodiacCode = (typeof ZODIAC_CODES)[number];

export type WinnerCategory = "overall" | "money" | "love" | "work" | "health";
export type FortuneScores = Record<"money" | "love" | "work" | "health", number | null>;

export type ParsedFortune = {
  zodiacCode: ZodiacCode;
  rank: number;
  comment: string;
  adviceLines: string[];
  luckyHint: string | null;
  luckyColor: string | null;
  luckyKey: string | null;
  scores: FortuneScores;
  winnerCategories: WinnerCategory[];
};

export type ParsedEdition = {
  source: Source;
  editionDate: string;
  sourceDateLabel: string;
  attribution: string | null;
  fortunes: ParsedFortune[];
};

export type IngestionAttempt = "primary" | "retry_1" | "retry_2" | "final" | "manual";
export type IngestionStatus =
  | "success" | "already_complete" | "not_expected"
  | "stale" | "invalid" | "fetch_error";
```

Implement `getJstDate` using `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" })`. Implement Ohaasa eligibility using the weekday and `@holiday-jp/holiday_jp`; always return true for Gogo. Add explicit Ohaasa and Gogo source-code maps in `zodiac.ts` and throw on unknown codes. Add typed failures:

```ts
export class StaleSourceError extends Error {
  readonly code = "SOURCE_STALE";
  constructor(readonly sourceDate: string) { super("Source date is stale"); this.name = "StaleSourceError"; }
}
export class InvalidEditionError extends Error {
  readonly code = "EDITION_INVALID";
  constructor(message: string) { super(message); this.name = "InvalidEditionError"; }
}
export class SourceFetchError extends Error {
  readonly code: string;
  constructor(code: string) { super("Source request failed"); this.name = "SourceFetchError"; this.code = code; }
}
```

Messages may describe structural failures but must never include source prose or response bodies.

- [ ] **Step 5: Run foundation verification**

Run:

```bash
npm test -- src/lib/time/jst.test.ts src/features/ingestion/source-policy.test.ts
npm run typecheck
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .nvmrc next.config.ts tsconfig.json eslint.config.mjs vitest.config.ts src
 git commit -m "chore: scaffold fortune graph application"
```

---

### Task 2: Postgres Schema and Atomic Repository

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/lib/env.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Create: `src/db/repository.ts`
- Create: `src/test/pglite.ts`
- Create: `src/test/factories.ts`
- Create: `drizzle/0000_initial.sql` via generation
- Test: `src/db/repository.test.ts`

**Interfaces:**
- Consumes: `Source`, `ParsedEdition`, `IngestionAttempt`, `IngestionStatus` from Task 1.
- Produces: `FortuneRepository`, `PersistEditionInput`, `RunResult`.
- Produces: `createFortuneRepository(db)` for production and PGlite tests.

- [ ] **Step 1: Write failing repository integration tests**

Create the shared invented factory in `src/test/factories.ts`:

```ts
export function makeParsedEdition(input: {
  source: Source;
  date: string;
  libraRank?: number;
}): ParsedEdition {
  const libraRank = input.libraRank ?? 7;
  const ranks = new Map<ZodiacCode, number>(ZODIAC_CODES.map((code, index) => [code, index + 1]));
  const displaced = ZODIAC_CODES[libraRank - 1];
  ranks.set(displaced, ranks.get("libra")!);
  ranks.set("libra", libraRank);
  return {
    source: input.source,
    editionDate: input.date,
    sourceDateLabel: input.date,
    attribution: input.source === "gogo" ? "Test Author" : null,
    fortunes: ZODIAC_CODES.map((zodiacCode) => ({
      zodiacCode,
      rank: ranks.get(zodiacCode)!,
      comment: `Invented fortune for ${zodiacCode}`,
      adviceLines: [`Invented advice for ${zodiacCode}`],
      luckyHint: input.source === "ohaasa" ? "Invented notebook" : null,
      luckyColor: input.source === "gogo" ? "blue" : null,
      luckyKey: input.source === "gogo" ? "small notebook" : null,
      scores: { money: null, love: null, work: null, health: null },
      winnerCategories: [],
    })),
  };
}

export function metadata(seed: string): PersistEditionMetadata {
  return {
    contentHash: `hash-${seed}`,
    parserVersion: 1,
    fetchedAt: new Date("2026-08-25T20:15:00Z"),
  };
}
```

Create `createTestRepository()` in `src/test/pglite.ts` by opening `new PGlite()`, creating a `drizzle-orm/pglite` database with `schema`, applying the generated migrations through `drizzle-orm/pglite/migrator`, and returning `{ client, repository: createFortuneRepository(db) }`.

Test against that migrated PGlite database:

```ts
it("saves one edition and exactly twelve entries atomically", async () => {
  const { client, repository } = await createTestRepository();
  await repository.saveEdition(makeParsedEdition({ source: "gogo", date: "2026-08-26" }), metadata("a"));
  expect(await repository.hasEdition("gogo", "2026-08-26")).toBe(true);
  expect(await repository.countEntries("gogo", "2026-08-26")).toBe(12);
  await client.close();
});

it("replaces all rows during a forced same-day correction", async () => {
  const { client, repository } = await createTestRepository();
  await repository.saveEdition(makeParsedEdition({ source: "gogo", date: "2026-08-26", libraRank: 2 }), metadata("a"));
  await repository.saveEdition(makeParsedEdition({ source: "gogo", date: "2026-08-26", libraRank: 1 }), metadata("b"));
  expect(await repository.getRank("gogo", "2026-08-26", "libra")).toBe(1);
  expect(await repository.countEntries("gogo", "2026-08-26")).toBe(12);
  await client.close();
});
```

- [ ] **Step 2: Run the repository test and verify it fails**

Run:

```bash
npm test -- src/db/repository.test.ts
```

Expected: FAIL because schema and repository modules do not exist.

- [ ] **Step 3: Implement schema and migrations**

Create Drizzle enums and tables matching the spec. The critical constraints are:

```ts
export const editions = pgTable("editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: sourceEnum("source").notNull(),
  editionDate: date("edition_date").notNull(),
  sourceDateLabel: text("source_date_label").notNull(),
  attribution: text("attribution"),
  contentHash: text("content_hash").notNull(),
  parserVersion: integer("parser_version").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("editions_source_date_unique").on(table.source, table.editionDate)]);

export const fortuneEntries = pgTable("fortune_entries", {
  editionId: uuid("edition_id").references(() => editions.id, { onDelete: "cascade" }).notNull(),
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
  winnerCategories: jsonb("winner_categories").$type<string[]>().notNull(),
}, (table) => [
  primaryKey({ columns: [table.editionId, table.zodiacCode] }),
  uniqueIndex("fortune_entries_edition_rank_unique").on(table.editionId, table.rank),
  check("fortune_entries_rank_range", sql`${table.rank} between 1 and 12`),
]);
```

Add `ingestion_runs` with the exact attempt/status enum values from Task 1 and sanitized metadata fields from the spec.

- [ ] **Step 4: Implement the repository contract**

```ts
export interface FortuneRepository {
  hasEdition(source: Source, date: string): Promise<boolean>;
  saveEdition(edition: ParsedEdition, metadata: PersistEditionMetadata): Promise<void>;
  startRun(input: StartRunInput): Promise<string>;
  finishRun(runId: string, result: RunResult): Promise<void>;
  countEntries(source: Source, date: string): Promise<number>;
  getRank(source: Source, date: string, zodiac: ZodiacCode): Promise<number | null>;
}
```

`saveEdition` must use one interactive transaction: upsert the edition, delete the edition’s prior entries, insert all 12 replacement rows, and commit. Implement production access with `Pool` from `@neondatabase/serverless` and `drizzle-orm/neon-serverless`; do not use the non-interactive `neon-http` session for this dependent upsert/delete/insert sequence. Implement a lazy `getDb()` so importing application modules during `next build` does not create a network connection. Type the repository factory against Drizzle’s shared PostgreSQL database/session surface so the same repository runs with Neon in production and PGlite in integration tests.

- [ ] **Step 5: Generate migration and verify repository behavior**

Run:

```bash
npm run db:generate
npm test -- src/db/repository.test.ts
npm run typecheck
```

Expected: migration is generated and all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add drizzle.config.ts drizzle src/lib/env.ts src/db src/test/pglite.ts src/test/factories.ts
 git commit -m "feat: add fortune persistence layer"
```

---

### Task 3: Ohaasa JSON Parser

**Files:**
- Create: `src/features/fortune/parsers/ohaasa.ts`
- Create: `src/test/fixtures/ohaasa-valid.json`
- Test: `src/features/fortune/parsers/ohaasa.test.ts`

**Interfaces:**
- Consumes: `ParsedEdition`, `ParsedFortune`, Ohaasa zodiac map.
- Produces: `parseOhaasa(payload: unknown, expectedDate: string): ParsedEdition`.

- [ ] **Step 1: Create invented fixture and failing parser tests**

The fixture must have 12 records and invented Japanese prose. Test:

```ts
it("normalizes twelve ranks, advice lines, and neutral lucky hints", () => {
  const edition = parseOhaasa(fixture, "2026-08-26");
  expect(edition.source).toBe("ohaasa");
  expect(edition.editionDate).toBe("2026-08-26");
  expect(edition.fortunes).toHaveLength(12);
  expect(edition.fortunes.find((item) => item.zodiacCode === "aries")).toMatchObject({
    rank: 4,
    adviceLines: ["新しい一歩を楽しめそう", "深呼吸して進もう"],
    luckyHint: "青いノート",
    luckyColor: null,
  });
});

it("rejects stale dates and malformed lucky boundaries", () => {
  expect(() => parseOhaasa(fixture, "2026-08-27")).toThrow(/stale/i);
  const malformed = structuredClone(fixture);
  malformed[0].detail[0].horoscope_text = "Invented advice without a lucky delimiter";
  expect(() => parseOhaasa(malformed, "2026-08-26")).toThrow(/lucky/i);
});
```

- [ ] **Step 2: Run the parser test and verify it fails**

Run:

```bash
npm test -- src/features/fortune/parsers/ohaasa.test.ts
```

Expected: FAIL because `parseOhaasa` does not exist.

- [ ] **Step 3: Implement schema parsing and normalization**

Use Zod for the source shape, require a one-record top-level array, parse `YYYYMMDD`, and compare with `expectedDate`. Throw `StaleSourceError(parsedDate)` for a date mismatch and `InvalidEditionError` for source-shape/text failures. Implement text parsing as:

```ts
function parseHoroscopeText(raw: string) {
  const boundary = raw.match(/\t{2,}/);
  if (!boundary || boundary.index === undefined) throw new Error("Ohaasa lucky hint boundary is missing");
  const adviceLines = raw.slice(0, boundary.index).split(/\t+/).map((value) => value.trim()).filter(Boolean);
  const luckyHint = raw.slice(boundary.index + boundary[0].length).trim();
  if (adviceLines.length === 0 || luckyHint.length === 0) throw new Error("Ohaasa advice or lucky hint is empty");
  return { adviceLines, luckyHint };
}
```

Map `01` through `12` explicitly. Leave unsupported fields null and join advice lines with `\n` for `comment`.

- [ ] **Step 4: Verify parser and edge cases**

Run:

```bash
npm test -- src/features/fortune/parsers/ohaasa.test.ts
npm run typecheck
```

Expected: all tests pass and typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/fortune/parsers/ohaasa.ts src/features/fortune/parsers/ohaasa.test.ts src/test/fixtures/ohaasa-valid.json
 git commit -m "feat: parse Ohaasa fortune feed"
```

---

### Task 4: Gogo HTML Parser

**Files:**
- Create: `src/features/fortune/parsers/gogo.ts`
- Create: `src/test/fixtures/gogo-valid.html`
- Test: `src/features/fortune/parsers/gogo.test.ts`

**Interfaces:**
- Consumes: `ParsedEdition`, `ParsedFortune`, Gogo zodiac map.
- Produces: `parseGogo(html: string, expectedDate: string): ParsedEdition`.

- [ ] **Step 1: Create an invented semantic HTML fixture and failing tests**

The fixture must model `.ttl-area`, `.rank-box`, all 12 canonical sign IDs, `.star-name`, `.read`, lucky labels, score containers, and winner markers without broadcaster prose/images.

```ts
it("parses date, ranks, fortune details, scores, and winner categories", () => {
  const edition = parseGogo(html, "2026-08-26");
  expect(edition.source).toBe("gogo");
  expect(edition.fortunes).toHaveLength(12);
  expect(edition.fortunes.find((item) => item.zodiacCode === "libra")).toMatchObject({
    rank: 1,
    comment: "協力すると良い流れを作れる日。",
    luckyColor: "青",
    luckyKey: "小さな手帳",
    scores: { money: 4, love: 5, work: 4, health: 3 },
    winnerCategories: ["overall", "love"],
  });
});

it("rejects wrong weekdays, duplicate ranks, and missing lucky fields", () => {
  expect(() => parseGogo(html.replace("Wed", "Thu"), "2026-08-26")).toThrow(/weekday/i);
  expect(() => parseGogo(html.replace("rank-2.png", "rank-1.png"), "2026-08-26")).toThrow(/rank/i);
  expect(() => parseGogo(html.replace("<span class=\"key-txt\">幸運のカギ</span>：小さな手帳", ""), "2026-08-26")).toThrow(/lucky key/i);
});
```

- [ ] **Step 2: Run the Gogo parser tests and verify they fail**

Run:

```bash
npm test -- src/features/fortune/parsers/gogo.test.ts
```

Expected: FAIL because `parseGogo` does not exist.

- [ ] **Step 3: Implement Cheerio normalization**

Parse rankings from `.rank-box a[data-label]` and `rank-(N).png`. Parse date with:

```ts
const DATE_RE = /(\d{1,2})月(\d{1,2})日（(Sun|Mon|Tue|Wed|Thu|Fri|Sat)）/;
```

For every canonical sign ID, require `.read`, `ラッキーカラー`, and `幸運のカギ`. Count score images only within `.lucky-box` category children. Map `.number-one-area` class tokens to winner categories. Throw `StaleSourceError(parsedDate)` for a date mismatch and `InvalidEditionError` for structure/content failures. Return exactly one canonical `ParsedEdition`.

- [ ] **Step 4: Verify parser and malformed-page behavior**

Run:

```bash
npm test -- src/features/fortune/parsers/gogo.test.ts
npm run typecheck
```

Expected: all tests pass and typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/fortune/parsers/gogo.ts src/features/fortune/parsers/gogo.test.ts src/test/fixtures/gogo-valid.html
 git commit -m "feat: parse Gogo horoscope page"
```

---

### Task 5: Edition Validation and Idempotent Ingestion Service

**Files:**
- Create: `src/features/fortune/validate-edition.ts`
- Create: `src/features/ingestion/http.ts`
- Create: `src/features/ingestion/service.ts`
- Test: `src/features/fortune/validate-edition.test.ts`
- Test: `src/features/ingestion/service.test.ts`

**Interfaces:**
- Consumes: parser functions, `FortuneRepository`, source policy, canonical domain types.
- Produces: `validateEdition(edition: ParsedEdition, expectedDate: string): void`.
- Produces: `SourceClient`, `SourceClients`, `IngestSourceInput`, and `ingestSource(input: IngestSourceInput): Promise<IngestionResult>`.

- [ ] **Step 1: Write failing invariant and service tests**

```ts
it("rejects incomplete, duplicate, and out-of-range editions", () => {
  const incomplete = makeParsedEdition({ source: "gogo", date: "2026-08-26" });
  incomplete.fortunes.pop();
  expect(() => validateEdition(incomplete, "2026-08-26")).toThrow(/12/);

  const duplicate = makeParsedEdition({ source: "gogo", date: "2026-08-26" });
  duplicate.fortunes[1].zodiacCode = duplicate.fortunes[0].zodiacCode;
  expect(() => validateEdition(duplicate, "2026-08-26")).toThrow(/zodiac/i);

  const outOfRange = makeParsedEdition({ source: "gogo", date: "2026-08-26" });
  outOfRange.fortunes[0].rank = 13;
  expect(() => validateEdition(outOfRange, "2026-08-26")).toThrow(/rank/i);
});
```

Define this test helper in `service.test.ts`:

```ts
function makeServiceInput(options: {
  source?: Source;
  targetDate?: string;
  hasEdition?: boolean;
  body?: unknown;
} = {}) {
  const source = options.source ?? "gogo";
  const targetDate = options.targetDate ?? "2026-08-26";
  const repository = {
    hasEdition: vi.fn().mockResolvedValue(options.hasEdition ?? false),
    saveEdition: vi.fn().mockResolvedValue(undefined),
    startRun: vi.fn().mockResolvedValue("run-1"),
    finishRun: vi.fn().mockResolvedValue(undefined),
    countEntries: vi.fn(),
    getRank: vi.fn(),
  } satisfies FortuneRepository;
  const selectedFetch = vi.fn().mockResolvedValue({
    body: options.body ?? (source === "gogo" ? gogoHtml : ohaasaFixture),
    httpStatus: 200,
  });
  const clients = {
    ohaasa: { fetch: source === "ohaasa" ? selectedFetch : vi.fn() },
    gogo: { fetch: source === "gogo" ? selectedFetch : vi.fn() },
  } satisfies SourceClients;
  return {
    repository,
    selectedFetch,
    input: {
      source, targetDate, attempt: "primary" as const, force: false,
      repository, clients, now: () => new Date("2026-08-25T20:15:00Z"),
    },
  };
}

it("does not fetch an already completed source", async () => {
  const test = makeServiceInput({ hasEdition: true });
  expect((await ingestSource(test.input)).status).toBe("already_complete");
  expect(test.selectedFetch).not.toHaveBeenCalled();
});

it("records stale data without saving it", async () => {
  const stale = structuredClone(ohaasaFixture);
  stale[0].onair_date = "20260825";
  const test = makeServiceInput({ source: "ohaasa", body: stale });
  expect((await ingestSource(test.input)).status).toBe("stale");
  expect(test.repository.saveEdition).not.toHaveBeenCalled();
});

it("saves one valid edition", async () => {
  const test = makeServiceInput({ source: "gogo" });
  expect(await ingestSource(test.input)).toMatchObject({ status: "success", source: "gogo" });
  expect(test.repository.saveEdition).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```bash
npm test -- src/features/fortune/validate-edition.test.ts src/features/ingestion/service.test.ts
```

Expected: FAIL because validator and service modules do not exist.

- [ ] **Step 3: Implement edition invariants and bounded HTTP**

`validateEdition` checks source/date, exact zodiac set, exact rank set, required comments, source-specific lucky fields, and unknown categories. It throws `StaleSourceError(edition.editionDate)` only for a date mismatch and `InvalidEditionError` for every other invariant failure.

`fetchText` and `fetchJson` use `AbortSignal.timeout(10_000)`, `cache: "no-store"`, and a configured identifying user agent. They throw sanitized errors containing status/code only, never bodies.

- [ ] **Step 4: Implement ingestion orchestration**

```ts
export type SourceResponse = { body: unknown; httpStatus: number };
export type SourceClient = { fetch(targetDate: string): Promise<SourceResponse> };
export type SourceClients = Record<Source, SourceClient>;
export type IngestSourceInput = {
  source: Source;
  targetDate: string;
  attempt: IngestionAttempt;
  force: boolean;
  repository: FortuneRepository;
  clients: SourceClients;
  now: () => Date;
};
export type IngestionResult = {
  source: Source;
  targetDate: string;
  status: IngestionStatus;
  sourceDate: string | null;
  runId: string;
  errorCode: string | null;
};

export async function ingestSource(input: IngestSourceInput): Promise<IngestionResult> {
  const { source, targetDate, attempt, force, repository, clients, now } = input;
  const runId = await repository.startRun({ source, targetDate, attempt, startedAt: now() });

  if (!isSourceExpected(source, targetDate)) {
    return finishAndReturn(repository, runId, {
      source, targetDate, status: "not_expected", sourceDate: null, errorCode: null,
    });
  }
  if (!force && await repository.hasEdition(source, targetDate)) {
    return finishAndReturn(repository, runId, {
      source, targetDate, status: "already_complete", sourceDate: targetDate, errorCode: null,
    });
  }

  try {
    const response = await clients[source].fetch(targetDate);
    const edition = source === "ohaasa"
      ? parseOhaasa(response.body, targetDate)
      : parseGogo(requireHtml(response.body), targetDate);
    validateEdition(edition, targetDate);
    const contentHash = createHash("sha256").update(stableEditionJson(edition)).digest("hex");
    await repository.saveEdition(edition, {
      contentHash, parserVersion: 1, fetchedAt: now(),
    });
    return finishAndReturn(repository, runId, {
      source, targetDate, status: "success", sourceDate: edition.editionDate, errorCode: null,
    });
  } catch (error) {
    const failure = classifyIngestionError(error);
    return finishAndReturn(repository, runId, {
      source, targetDate, status: failure.status,
      sourceDate: failure.sourceDate, errorCode: failure.code,
    });
  }
}
```

Inject repository, source clients, and clock in tests. Use SHA-256 over a stable JSON serialization of the normalized edition. Make `force` bypass only `hasEdition`; it does not bypass validation. Implement the private helpers with these exact contracts:

```ts
function requireHtml(body: unknown): string {
  if (typeof body !== "string") throw new InvalidEditionError("Gogo response is not HTML text");
  return body;
}
function stableEditionJson(edition: ParsedEdition): string {
  return JSON.stringify({ ...edition, fortunes: [...edition.fortunes].sort((a, b) => a.zodiacCode.localeCompare(b.zodiacCode)) });
}
function classifyIngestionError(error: unknown): {
  status: "stale" | "invalid" | "fetch_error";
  sourceDate: string | null;
  code: string;
} {
  if (error instanceof StaleSourceError) return { status: "stale", sourceDate: error.sourceDate, code: error.code };
  if (error instanceof SourceFetchError) return { status: "fetch_error", sourceDate: null, code: error.code };
  return { status: "invalid", sourceDate: null, code: "EDITION_INVALID" };
}
async function finishAndReturn(
  repository: FortuneRepository,
  runId: string,
  result: Omit<IngestionResult, "runId">,
): Promise<IngestionResult> {
  await repository.finishRun(runId, result);
  return { ...result, runId };
}
```

Parsers and the validator throw `StaleSourceError` or `InvalidEditionError`; HTTP helpers throw `SourceFetchError`. No classifier reads response bodies or source prose.

- [ ] **Step 5: Verify service paths**

Run:

```bash
npm test -- src/features/fortune/validate-edition.test.ts src/features/ingestion/service.test.ts
npm run typecheck
```

Expected: all tests pass and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/fortune/validate-edition.ts src/features/fortune/validate-edition.test.ts src/features/ingestion
 git commit -m "feat: add validated ingestion service"
```

---

### Task 6: Protected Vercel Endpoint and GitHub Scheduler

**Files:**
- Create: `src/features/ingestion/request-auth.ts`
- Create: `src/app/api/internal/ingest/route.ts`
- Create: `.github/workflows/ingest.yml`
- Create: `.env.example`
- Test: `src/features/ingestion/request-auth.test.ts`
- Test: `src/app/api/internal/ingest/route.test.ts`

**Interfaces:**
- Consumes: `ingestSource`, repository, source clients, `getJstDate`.
- Produces: POST body `{ attempt, source, force }` and response `{ targetDate, results }`.
- Produces: `isAuthorized(request: Request, secret: string): boolean`.

- [ ] **Step 1: Write failing authorization and route tests**

```ts
function requestWithBearer(secret: string) {
  return new Request("http://test/api/internal/ingest", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ attempt: "primary", source: "gogo", force: false }),
  });
}

it("rejects missing and incorrect bearer secrets", () => {
  expect(isAuthorized(new Request("http://test"), "correct-secret")).toBe(false);
  expect(isAuthorized(requestWithBearer("wrong-secret"), "correct-secret")).toBe(false);
  expect(isAuthorized(requestWithBearer("correct-secret"), "correct-secret")).toBe(true);
});
```

```ts
const fixedNow = () => new Date("2026-08-25T20:15:00Z");
function makeRequest(body: { attempt: IngestionAttempt; source: Source | "all"; force: boolean }) {
  return new Request("http://test/api/internal/ingest", {
    method: "POST",
    headers: { authorization: "Bearer correct-secret", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

it("returns 424 on the final attempt when an expected source is unresolved", async () => {
  const ingest = vi.fn().mockResolvedValue({
    source: "gogo", targetDate: "2026-08-26", status: "stale",
    sourceDate: "2026-08-25", runId: "run-1", errorCode: "SOURCE_STALE",
  });
  const handler = createPostHandler({ ingest, now: fixedNow, secret: "correct-secret" });
  const response = await handler(makeRequest({ attempt: "final", source: "gogo", force: false }));
  expect(response.status).toBe(424);
});
```

- [ ] **Step 2: Run route tests and verify they fail**

Run:

```bash
npm test -- src/features/ingestion/request-auth.test.ts src/app/api/internal/ingest/route.test.ts
```

Expected: FAIL because route/auth helpers do not exist.

- [ ] **Step 3: Implement timing-safe authorization and request validation**

Use Zod for the body. Compare equal-length secret buffers using `crypto.timingSafeEqual`; reject absent secrets before comparison. Export a dependency-injected `createPostHandler` and bind production dependencies in `POST`.

Earlier attempts return 200 with structured pending results. A final attempt returns 424 if an expected source is `stale`, `invalid`, or `fetch_error`. `not_expected` and `already_complete` are successful terminal states. Export `const runtime = "nodejs"` from the production route so Cheerio, bcrypt, crypto, and the Neon WebSocket transaction driver never run in the Edge runtime.

- [ ] **Step 4: Add GitHub Actions scheduling**

Create the schedule and manual inputs exactly:

```yaml
on:
  schedule:
    - cron: "15 20 * * *"
    - cron: "15 21 * * *"
    - cron: "45 22 * * *"
    - cron: "50 23 * * *"
  workflow_dispatch:
    inputs:
      source:
        type: choice
        options: [all, ohaasa, gogo]
        default: all
      force:
        type: boolean
        default: false
```

Derive `attempt` from `github.event.schedule` with `15 20` → `primary`, `15 21` → `retry_1`, `45 22` → `retry_2`, and `50 23` → `final`; manual runs use `manual`. Build the body with `jq` and call:

```bash
curl --fail-with-body --silent --show-error \
  -X POST "$INGEST_URL" \
  -H "Authorization: Bearer $INGEST_SECRET" \
  -H "Content-Type: application/json" \
  --data "$BODY"
```

Use GitHub environment secrets `INGEST_URL` and `INGEST_SECRET`. Do not print either value.

- [ ] **Step 5: Verify endpoint/workflow behavior**

Run:

```bash
npm test -- src/features/ingestion/request-auth.test.ts src/app/api/internal/ingest/route.test.ts
npm run typecheck
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/features/ingestion/request-auth.ts src/features/ingestion/request-auth.test.ts src/app/api/internal/ingest .github/workflows/ingest.yml .env.example
 git commit -m "feat: schedule protected daily ingestion"
```

---

### Task 7: Private Credentials Authentication

**Files:**
- Create: `src/auth/credentials.ts`
- Create: `src/auth/auth-options.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/login/login-form.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/(private)/layout.tsx`
- Test: `src/auth/credentials.test.ts`
- Test: `src/app/(private)/layout.test.tsx`

**Interfaces:**
- Consumes: environment configuration.
- Produces: `authOptions`, `verifyCredentials(username, password)`, authenticated private layout.

- [ ] **Step 1: Write failing credential and private-layout tests**

```ts
const testEnv = {
  PRIVATE_USERNAME: "owner",
  PRIVATE_PASSWORD_HASH: await hash("correct horse", 4),
  NEXTAUTH_SECRET: "test-secret-with-at-least-thirty-two-characters",
  NEXTAUTH_URL: "http://localhost:3000",
};

it("accepts only the configured username and bcrypt password", async () => {
  expect(await verifyCredentials("owner", "correct horse", testEnv)).toEqual({ id: "owner", name: "owner" });
  expect(await verifyCredentials("owner", "wrong", testEnv)).toBeNull();
  expect(await verifyCredentials("other", "correct horse", testEnv)).toBeNull();
});
```

Mock `getServerSession` and `redirect`, then test the server layout directly:

```tsx
it("redirects unauthenticated requests to login", async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  vi.mocked(redirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT:/login"); });
  await expect(PrivateLayout({ children: <p>Private content</p> })).rejects.toThrow("NEXT_REDIRECT:/login");
});

it("renders authenticated children", async () => {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { name: "owner" }, expires: "2099-01-01T00:00:00.000Z",
  });
  render(await PrivateLayout({ children: <p>Private content</p> }));
  expect(screen.getByText("Private content")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run auth tests and verify they fail**

Run:

```bash
npm test -- src/auth/credentials.test.ts 'src/app/(private)/layout.test.tsx'
```

Expected: FAIL because auth modules do not exist.

- [ ] **Step 3: Implement stable NextAuth credentials flow**

Configure `next-auth@4.24.15` with JWT sessions, `pages: { signIn: "/login" }`, and a credentials provider. Validate `PRIVATE_USERNAME`, `PRIVATE_PASSWORD_HASH`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`; compare with `bcrypt.compare`. `login-form.tsx` is a client component that calls `signIn("credentials", { username, password, redirect: false })` from `next-auth/react`, renders a generic invalid-credentials message, and navigates to `/` after success without exposing the hash. The private server layout calls `getServerSession(authOptions)` and redirects when absent.

- [ ] **Step 4: Verify private access**

Run:

```bash
npm test -- src/auth/credentials.test.ts 'src/app/(private)/layout.test.tsx'
npm run typecheck
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/auth src/app/api/auth src/app/login 'src/app/(private)/layout.tsx' 'src/app/(private)/layout.test.tsx'
 git commit -m "feat: protect private fortune content"
```

---

### Task 8: Rank-Market Read Model and Metrics

**Files:**
- Create: `src/features/rank-market/types.ts`
- Create: `src/features/rank-market/queries.ts`
- Create: `src/features/rank-market/metrics.ts`
- Create: `src/test/fixtures/dashboard-data.ts`
- Test: `src/features/rank-market/queries.test.ts`
- Test: `src/features/rank-market/metrics.test.ts`

**Interfaces:**
- Consumes: `editions`, `fortuneEntries`, canonical source/zodiac types.
- Produces: `getRankMarketData({ days: 90 }): Promise<RankMarketData>`.
- Produces: `getMovement`, `getTopThreeStreak`, `getBiggestMover`, `buildCalendarHistory`.

- [ ] **Step 1: Write failing metric tests**

```ts
it("computes movement against the previous captured edition of the same source", () => {
  expect(getMovement({ currentRank: 2, previousRank: 7 })).toEqual({ places: 5, direction: "up" });
});

it("keeps Ohaasa missing calendar dates as null gaps", () => {
  expect(buildCalendarHistory("2026-08-14", "2026-08-17", [
    { date: "2026-08-14", rank: 3 },
    { date: "2026-08-17", rank: 1 },
  ])).toEqual([
    { date: "2026-08-14", rank: 3 },
    { date: "2026-08-15", rank: null },
    { date: "2026-08-16", rank: null },
    { date: "2026-08-17", rank: 1 },
  ]);
});
```

Add a PGlite query test that inserts two source editions and verifies the read model keeps them independent and includes all 12 latest entries.

- [ ] **Step 2: Run read-model tests and verify they fail**

Run:

```bash
npm test -- src/features/rank-market/metrics.test.ts src/features/rank-market/queries.test.ts
```

Expected: FAIL because rank-market modules do not exist.

- [ ] **Step 3: Implement exact view types and calculations**

```ts
export type SourceEditionView = {
  source: Source;
  editionDate: string;
  entries: ParsedFortune[];
};
export type RankMovement = { places: number; direction: "up" | "down" | "same" };
export type RankMarketData = {
  generatedAt: string;
  sources: Record<Source, {
    latest: SourceEditionView | null;
    history: Record<ZodiacCode, Array<{ date: string; rank: number | null }>>;
    movements: Record<ZodiacCode, RankMovement | null>;
    biggestMover: ZodiacCode | null;
  }>;
};
```

Queries load no more than 90 days, order by source/date/rank, and return explicit source dates. Metrics use captured editions; history fills calendar gaps with null and never duplicates ranks across missing dates.

In `src/test/fixtures/dashboard-data.ts`, export the fixtures used by Tasks 9–10:

```ts
const emptyHistory = () => Object.fromEntries(
  ZODIAC_CODES.map((code) => [code, []]),
) as Record<ZodiacCode, Array<{ date: string; rank: number | null }>>;
const emptyMovements = () => Object.fromEntries(
  ZODIAC_CODES.map((code) => [code, null]),
) as Record<ZodiacCode, RankMovement | null>;
const ohaasaEdition = makeParsedEdition({ source: "ohaasa", date: "2026-08-26", libraRank: 9 });
const gogoEdition = makeParsedEdition({ source: "gogo", date: "2026-08-26", libraRank: 1 });
export const ohaasaFortune = ohaasaEdition.fortunes.find((item) => item.zodiacCode === "libra")!;
export const gogoFortune = gogoEdition.fortunes.find((item) => item.zodiacCode === "libra")!;
export const historyWithWeekendGap = [
  { date: "2026-08-14", rank: 3 },
  { date: "2026-08-15", rank: null },
  { date: "2026-08-16", rank: null },
  { date: "2026-08-17", rank: 1 },
];
export const dashboardFixture: RankMarketData = {
  generatedAt: "2026-08-26T05:15:00+09:00",
  sources: {
    ohaasa: {
      latest: { source: "ohaasa", editionDate: "2026-08-26", entries: ohaasaEdition.fortunes },
      history: emptyHistory(), movements: emptyMovements(), biggestMover: "taurus",
    },
    gogo: {
      latest: { source: "gogo", editionDate: "2026-08-26", entries: gogoEdition.fortunes },
      history: emptyHistory(), movements: emptyMovements(), biggestMover: "aquarius",
    },
  },
};
```

- [ ] **Step 4: Verify query and metric behavior**

Run:

```bash
npm test -- src/features/rank-market/metrics.test.ts src/features/rank-market/queries.test.ts
npm run typecheck
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/rank-market/types.ts src/features/rank-market/queries.ts src/features/rank-market/queries.test.ts src/features/rank-market/metrics.ts src/features/rank-market/metrics.test.ts src/test/fixtures/dashboard-data.ts
 git commit -m "feat: add rank market read model"
```

---

### Task 9: Market-Style Source and Zodiac Experience

**Files:**
- Modify: `src/app/globals.css`
- Delete: `src/app/page.tsx`
- Create: `src/app/(private)/page.tsx`
- Create: `src/features/rank-market/rank-market.tsx`
- Create: `src/features/rank-market/rank-market.module.css`
- Create: `src/features/rank-market/components/source-toggle.tsx`
- Create: `src/features/rank-market/components/sign-picker.tsx`
- Create: `src/features/rank-market/components/rank-hero.tsx`
- Create: `src/features/rank-market/components/rank-race.tsx`
- Test: `src/features/rank-market/rank-market.test.tsx`

**Interfaces:**
- Consumes: `RankMarketData` from Task 8.
- Produces: `<RankMarket initialData={data} />` with global source/sign state.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it("switches the entire experience from Ohaasa to Gogo", async () => {
  const user = userEvent.setup();
  render(<RankMarket initialData={dashboardFixture} />);
  expect(screen.getByRole("heading", { name: /#9.*12/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Gogo" }));
  expect(screen.getByRole("heading", { name: /#1.*12/i })).toBeInTheDocument();
  expect(screen.getByText("Viewing Gogo")).toBeInTheDocument();
  expect(screen.getByText("Libra · you")).toBeInTheDocument();
});

it("changes zodiac and persists the choice", async () => {
  const user = userEvent.setup();
  render(<RankMarket initialData={dashboardFixture} />);
  await user.click(screen.getByRole("button", { name: "Aquarius" }));
  expect(screen.getByRole("heading", { name: /Aquarius/ })).toBeInTheDocument();
  expect(localStorage.getItem("selected-zodiac")).toBe("aquarius");
});
```

- [ ] **Step 2: Run component tests and verify they fail**

Run:

```bash
npm test -- src/features/rank-market/rank-market.test.tsx
```

Expected: FAIL because the rank-market components do not exist.

- [ ] **Step 3: Implement global source/sign state**

`RankMarket` is the single client-state owner. Initialize source to the first available source and zodiac from validated local storage, falling back to Libra. Source toggle changes hero, race, fortune, metrics, and chart inputs together. Do not compute a combined rank.

- [ ] **Step 4: Implement approved visual shell**

Create the dark navy market-inspired design: live-status header, “What rank am I today?” hero, prominent Ohaasa/Gogo segmented toggle, horizontally scrollable zodiac selector, large `#N / 12` rank, source comparison cards, and all-12 rank race. Use text labels and focus styles; no source artwork.

The private page is a server component:

```tsx
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getRankMarketData({ days: 90 });
  return <RankMarket initialData={data} />;
}
```

- [ ] **Step 5: Verify UI interactions and static quality**

Run:

```bash
npm test -- src/features/rank-market/rank-market.test.tsx
npm run typecheck
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css 'src/app/(private)/page.tsx' src/features/rank-market
 git commit -m "feat: build interactive rank market"
```

---

### Task 10: Trends, Fortune Details, Metrics, and Empty States

**Files:**
- Create: `src/features/rank-market/components/rank-trend.tsx`
- Create: `src/features/rank-market/components/fortune-panel.tsx`
- Create: `src/features/rank-market/components/rank-metrics.tsx`
- Create: `src/features/rank-market/components/data-status.tsx`
- Modify: `src/features/rank-market/rank-market.tsx`
- Modify: `src/features/rank-market/rank-market.module.css`
- Test: `src/features/rank-market/components/rank-trend.test.tsx`
- Test: `src/features/rank-market/components/fortune-panel.test.tsx`
- Test: `src/features/rank-market/rank-market.test.tsx`

**Interfaces:**
- Consumes: selected source/zodiac, latest fortune, history, movements, biggest mover.
- Produces: accessible 7/30/90 trend controls and source-specific fortune display.

- [ ] **Step 1: Write failing detail/chart/state tests**

```tsx
it("shows source-specific lucky fields", () => {
  const { rerender } = render(<FortunePanel source="ohaasa" fortune={ohaasaFortune} />);
  expect(screen.getByText("Lucky hint")).toBeInTheDocument();
  expect(screen.queryByText("Lucky color")).not.toBeInTheDocument();
  rerender(<FortunePanel source="gogo" fortune={gogoFortune} />);
  expect(screen.getByText("Lucky color")).toBeInTheDocument();
  expect(screen.getByText("Lucky key")).toBeInTheDocument();
});

it("keeps null dates disconnected and exposes range controls", async () => {
  render(<RankTrend points={historyWithWeekendGap} range={30} onRangeChange={vi.fn()} />);
  expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText("Rank history")).toHaveAttribute("data-connect-nulls", "false");
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- src/features/rank-market/components src/features/rank-market/rank-market.test.tsx
```

Expected: FAIL because detail/chart components do not exist.

- [ ] **Step 3: Implement rank trend and metrics**

Use Recharts with rank 1 at the top, rank 12 at the bottom, `connectNulls={false}`, labeled tooltips, and 7/30/90 controls. Render real movement, top-three streak, and biggest mover. If fewer than two editions exist, display “Building history” instead of zero/fake movement.

- [ ] **Step 4: Implement fortune and freshness panels**

Ohaasa displays comment/advice and `Lucky hint`. Gogo displays comment, `Lucky color`, `Lucky key`, nullable category scores, and winner labels. Display exact source edition date and a stale badge when it is older than the current expected source date. Never label old data as today.

- [ ] **Step 5: Finish responsive and accessible behavior**

At mobile widths, keep the source toggle prominent, convert multi-column cards to one column, preserve horizontal sign scrolling, and keep the all-12 race usable. Verify keyboard focus, button names, contrast, and no color-only status.

- [ ] **Step 6: Verify complete frontend behavior**

Run:

```bash
npm test -- src/features/rank-market
npm run typecheck
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/features/rank-market
 git commit -m "feat: add fortune trends and details"
```

---

### Task 11: End-to-End Verification, CI, and Operations

**Files:**
- Create: `playwright.config.ts`
- Create: `src/test/fixtures/rank-market-fixture.ts`
- Create: `src/features/rank-market/load-data.ts`
- Create: `tests/private-rank-market.spec.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Create: `docs/operations.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: complete application.
- Produces: non-production `DATA_FIXTURE_MODE=1` read path, browser verification, CI, deployment runbook.

- [ ] **Step 1: Write the failing browser journey**

```ts
test("owner signs in and switches source and zodiac", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Username").fill("owner");
  await page.getByLabel("Password").fill("correct horse");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /What rank am I today/i })).toBeVisible();
  await page.getByRole("button", { name: "Gogo" }).click();
  await expect(page.getByText("Viewing Gogo")).toBeVisible();
  await page.getByRole("button", { name: "Aquarius" }).click();
  await expect(page.getByRole("heading", { name: /Aquarius/ })).toBeVisible();
});
```

Add a mobile project at 390×844 and assert the source toggle and rank hero remain visible.

- [ ] **Step 2: Run Playwright and verify the journey fails**

Run:

```bash
npx playwright install chromium
npm run test:e2e
```

Expected: FAIL because fixture-mode loading and Playwright configuration are incomplete.

- [ ] **Step 3: Add safe fixture-mode data loading**

Create `loadRankMarketData()` that returns invented fixture data only when both conditions hold:

```ts
if (process.env.DATA_FIXTURE_MODE === "1" && process.env.NODE_ENV !== "production") {
  return rankMarketFixture;
}
return getRankMarketData({ days: 90 });
```

Update the private page to call this function. Configure Playwright’s web server with these test-only values and `DATA_FIXTURE_MODE=1`; production must reject fixture mode:

```ts
webServer: {
  command: "npm run dev",
  url: "http://127.0.0.1:3000",
  reuseExistingServer: !process.env.CI,
  env: {
    DATA_FIXTURE_MODE: "1",
    PRIVATE_USERNAME: "owner",
    PRIVATE_PASSWORD_HASH: "$2b$04$pEQRgB0EyvbiupFbd0AAPeL2wPrDEWOKay1x3m5nIVIhqiKncMHlm",
    NEXTAUTH_SECRET: "test-secret-with-at-least-thirty-two-characters",
    NEXTAUTH_URL: "http://127.0.0.1:3000",
    INGEST_SECRET: "test-ingest-secret-with-at-least-thirty-two-characters",
    DATABASE_URL: "postgres://unused:unused@127.0.0.1:5432/unused",
  },
}
```

- [ ] **Step 4: Add CI and operational documentation**

CI runs on pushes and pull requests with non-production fixture/auth variables scoped to the job:

```yaml
env:
  DATA_FIXTURE_MODE: "1"
  PRIVATE_USERNAME: "owner"
  PRIVATE_PASSWORD_HASH: "$2b$04$pEQRgB0EyvbiupFbd0AAPeL2wPrDEWOKay1x3m5nIVIhqiKncMHlm"
  NEXTAUTH_SECRET: "test-secret-with-at-least-thirty-two-characters"
  NEXTAUTH_URL: "http://127.0.0.1:3000"
  INGEST_SECRET: "test-ingest-secret-with-at-least-thirty-two-characters"
  DATABASE_URL: "postgres://unused:unused@127.0.0.1:5432/unused"
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 22
      cache: npm
  - run: npm ci
  - run: npm run lint
  - run: npm run typecheck
  - run: npm test
  - run: npm run build
  - run: npx playwright install --with-deps chromium
  - run: npm run test:e2e
```

Document Neon provisioning, migrations, Vercel environment variables, GitHub secrets, manual ingestion, force recovery, final-attempt notification, stale/invalid diagnosis, and the public-release rights gate. Document that source HTML/JSON contracts are undocumented and may drift.

- [ ] **Step 5: Run complete verification**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
git status --short
```

Expected: lint/typecheck/tests/build/e2e all exit 0. Git status contains only intentional documentation/configuration changes for this task and no `.env` files, `.superpowers/`, or `.pi-subagents/` artifacts.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests src/test/fixtures/rank-market-fixture.ts src/features/rank-market/load-data.ts .github/workflows/ci.yml README.md docs/operations.md .env.example
 git commit -m "test: verify private fortune graph application"
```

---

## Final Acceptance Run

After all task commits, run:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
git status --short --branch
```

Then perform one manual deployment smoke test:

1. Sign in to the Vercel deployment.
2. Confirm unauthenticated access redirects to `/login`.
3. Trigger GitHub Actions `workflow_dispatch` with `source=all`, `force=false`.
4. Confirm the response contains one terminal result per source without fortune prose.
5. Confirm Ohaasa/Gogo source switching updates the rank hero, all-12 race, chart, and fortune panel.
6. Confirm the displayed edition dates match the persisted Japanese source dates.
7. Confirm no source images or logos appear.
8. Leave public access disabled pending rights review.
