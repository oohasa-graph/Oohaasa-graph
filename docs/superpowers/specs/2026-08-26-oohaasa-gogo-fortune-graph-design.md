# Oohaasa/Gogo Fortune Graph Design

**Date:** 2026-08-26  
**Status:** Approved for implementation planning  
**Product phase:** Private prototype

## 1. Purpose

Build a private Vercel-hosted web application that archives the daily zodiac rankings from Ohaasa and Gogo and presents them as an exciting, market-inspired “What rank am I today?” experience.

The product must:

- collect Ohaasa on its supported ordinary weekdays;
- collect Gogo every day, including weekends and Japanese public holidays;
- preserve historical rankings because the broadcaster pages expose only the current edition;
- show each source independently through a prominent Ohaasa/Gogo toggle;
- display rankings, comments, advice, and source-specific lucky fields;
- provide personal rank, movement, streak, rank-race, and history visualizations;
- remain private until content-republication permission has been reviewed.

## 2. Scope

### Included

- Next.js web application deployed on Vercel Hobby.
- GitHub Actions as the external free scheduler.
- Neon Postgres for normalized historical storage.
- Ohaasa ingestion from its first-party JSON endpoint.
- Gogo ingestion from its first-party horoscope HTML, with its first-party mobile HTML retained as a documented fallback surface.
- Secret-protected, idempotent ingestion endpoint.
- Single-user private authentication.
- Source-specific daily rankings and historical trends.
- Fortune comments, Ohaasa lucky hint, and Gogo lucky color/key/category information.
- Responsive market-inspired user interface.
- Parser, ingestion, query, and browser tests.

### Excluded

- Ohaasa Saturday/weekend horoscope.
- Ohaasa holiday-edition horoscope.
- Public registration or multi-user profiles.
- Republishing broadcaster images, logos, or zodiac artwork.
- Betting, financial transactions, odds, or prediction-market functionality.
- Fabricated probabilities or a synthesized “combined” rank.
- Backfilling dates that were not captured while current at the source.
- Public release before rights review.

## 3. Legal and product guardrails

The source paths are not disallowed by their current `robots.txt` files, but that does not grant a content-republication license. Both broadcasters reserve rights over site text and artwork.

For the private prototype:

- require authentication before returning fortune content;
- never copy source images or branding;
- keep the repository private;
- do not expose fortune records through an unauthenticated API;
- avoid logging full source comments or raw responses;
- use invented text in committed parser fixtures;
- treat public launch as blocked until permission/legal review is complete.

## 4. Technology

- **Application:** Next.js App Router with TypeScript.
- **Hosting:** Vercel Hobby.
- **Database:** Neon Postgres.
- **Database access:** Drizzle ORM with SQL migrations.
- **HTML parsing:** Cheerio for Gogo.
- **Charts:** Recharts for rank trends and sparklines; CSS for rank cards and race rows.
- **Authentication:** stable NextAuth 4/Auth.js credentials flow using an environment-provided password hash and signed, HTTP-only JWT session cookie.
- **Unit/integration tests:** Vitest.
- **Browser tests:** Playwright.
- **Scheduling:** GitHub Actions scheduled workflow plus `workflow_dispatch`.

## 5. Architecture

```text
GitHub Actions scheduler
        │
        │ Authorization: Bearer <INGEST_SECRET>
        ▼
Vercel POST /api/internal/ingest
        │
        ├── source policy / idempotency check
        ├── Ohaasa adapter ── official JSON
        └── Gogo adapter ──── official HTML
                    │
              parse + validate
                    │
             atomic transaction
                    ▼
              Neon Postgres
                    │
          authenticated server queries
                    ▼
          Next.js rank-market interface
```

Users never trigger source requests. The web interface reads only archived database records.

## 6. Scheduling

GitHub Actions runs at four daily UTC schedules:

| Attempt | JST | UTC cron | Purpose |
|---|---:|---:|---|
| Primary | 05:15 | `15 20 * * *` | Normal publication window |
| Retry 1 | 06:15 | `15 21 * * *` | Covers delayed and exceptional 06:00 updates |
| Retry 2 | 07:45 | `45 22 * * *` | After the Ohaasa weekday broadcast segment |
| Final | 08:50 | `50 23 * * *` | Final attempt before the 09:00 freshness target |

All schedules are UTC and execute on the previous UTC calendar date relative to Japan. The endpoint always computes the target date in `Asia/Tokyo`; it never trusts the GitHub runner’s local date.

Each scheduled call includes an attempt label. Before contacting a broadcaster, the ingestion service checks whether that source already has a successful edition for the target date. A completed source becomes a no-op for later attempts.

A manual workflow accepts `source` (`all`, `ohaasa`, or `gogo`) and `force` inputs for operational recovery. `force` may refresh an existing same-day edition but remains secret-protected.

### Source eligibility

- **Ohaasa:** ordinary Monday–Friday dates only. Saturday, Sunday, and Japanese public holidays are `not_expected`; no Ohaasa request is made. No alternate weekend or holiday URL is fetched.
- **Gogo:** expected every calendar day, including weekends and holidays.

Japanese public-holiday detection is isolated behind a tested calendar function so its data source or package can be replaced without changing ingestion logic.

## 7. Source adapters

Both adapters implement one interface and return the same canonical edition type.

```ts
type Source = "ohaasa" | "gogo";
type ZodiacCode =
  | "aries" | "taurus" | "gemini" | "cancer"
  | "leo" | "virgo" | "libra" | "scorpio"
  | "sagittarius" | "capricorn" | "aquarius" | "pisces";

type ParsedFortune = {
  zodiacCode: ZodiacCode;
  rank: number;
  comment: string;
  adviceLines: string[];
  luckyHint: string | null;
  luckyColor: string | null;
  luckyKey: string | null;
  scores: {
    money: number | null;
    love: number | null;
    work: number | null;
    health: number | null;
  };
  winnerCategories: Array<"overall" | "money" | "love" | "work" | "health">;
};

type ParsedEdition = {
  source: Source;
  editionDate: string; // YYYY-MM-DD in Asia/Tokyo
  sourceDateLabel: string;
  attribution: string | null;
  fortunes: ParsedFortune[];
};
```

### Ohaasa

Primary endpoint:

`https://www.asahi.co.jp/data/ohaasa2020/horoscope.json`

Observed source structure:

- top-level one-element array;
- `onair_date` as `YYYYMMDD`;
- exactly 12 `detail` objects;
- `ranking_no` from 1 through 12;
- `horoscope_st` codes `01` through `12`;
- `horoscope_text` containing tab-separated advice and a final lucky token.

Parsing rules:

1. Map `horoscope_st` through an explicit immutable zodiac lookup.
2. Split `horoscope_text` while preserving ordered advice lines.
3. Treat the final lucky token as `luckyHint`, not always as an item or color.
4. Preserve the joined advice as `comment`.
5. Leave unsupported Gogo-only fields null.

The human Ohaasa page is a health/reference surface, not the ingestion source.

### Gogo

Primary endpoint:

`https://www.tv-asahi.co.jp/goodmorning/uranai/`

Documented fallback surface:

`https://www.tv-asahi.co.jp/headline/sphone/fortune/`

Parsing rules:

1. Parse the displayed month/day/weekday label.
2. Compare it directly with the expected `Asia/Tokyo` target date; do not silently infer a different date.
3. Parse the ranking list through rank-image tokens and canonical sign identifiers.
4. Parse each sign section for comment, lucky color, and lucky key.
5. Count money/love/work/health icons only inside their score containers so winner badges cannot inflate scores.
6. Parse overall and category winner markers separately.
7. Treat scores and winner categories as nullable if the page omits them, but keep comment/color/key required.

The desktop HTML remains authoritative. The mobile surface is not automatically substituted without passing the same canonical validation.

## 8. Validation

No edition is published unless all required invariants pass:

- source date equals the target date in Japan;
- exactly 12 fortunes are present;
- all 12 canonical zodiac codes appear exactly once;
- ranks are integers containing every value from 1 through 12 exactly once;
- required comments are nonempty;
- Ohaasa lucky hints are parseable;
- Gogo lucky colors and keys are nonempty;
- Gogo’s displayed weekday agrees with the target date;
- no unknown zodiac or category tokens are present.

Validation happens before the database transaction. Partial editions are never visible.

## 9. Persistence model

### `editions`

- `id` UUID primary key
- `source` enum (`ohaasa`, `gogo`)
- `edition_date` date
- `source_date_label` text
- `attribution` text nullable
- `content_hash` text
- `parser_version` integer
- `fetched_at` timestamp with timezone
- `created_at` timestamp with timezone
- `updated_at` timestamp with timezone
- unique (`source`, `edition_date`)

### `fortune_entries`

- `edition_id` UUID foreign key
- `zodiac_code` canonical text/enum
- `rank` small integer with check `1 <= rank <= 12`
- `comment` text
- `advice_lines` JSONB array
- `lucky_hint` text nullable
- `lucky_color` text nullable
- `lucky_key` text nullable
- `money_score`, `love_score`, `work_score`, `health_score` nullable small integers
- `winner_categories` JSONB array
- primary key (`edition_id`, `zodiac_code`)
- unique (`edition_id`, `rank`)

The application validates that all 12 rows exist before commit; uniqueness and rank range are additionally enforced by Postgres.

### `ingestion_runs`

- `id` UUID primary key
- `source` enum
- `target_date` date
- `attempt` enum (`primary`, `retry_1`, `retry_2`, `final`, `manual`)
- `status` enum (`success`, `already_complete`, `not_expected`, `stale`, `invalid`, `fetch_error`)
- `source_date` date nullable
- `http_status` integer nullable
- `content_hash` text nullable
- `error_code` text nullable
- `error_summary` text nullable and sanitized
- `started_at`, `finished_at` timestamps with timezone

Full responses and fortune prose are not written to logs or failed-run records.

## 10. Idempotency and corrections

The canonical business key is (`source`, `edition_date`).

- Normal repeated attempts return `already_complete` without fetching.
- The normalized payload is hashed before persistence.
- A transaction upserts the edition and replaces its 12 entries together.
- A failed validation or transaction leaves the previous valid state untouched.
- A secured manual `force` import can apply a same-day correction.
- Historical editions are never relabeled as today.

## 11. Failure handling and monitoring

Each invocation performs at most one outbound request per unresolved source. The scheduler provides the bounded retry cadence, avoiding aggressive internal retry loops.

- Use a short fetch timeout and an identifying user agent with a project contact address when available.
- Treat 429, timeout, and 5xx responses as `fetch_error` and wait for the next scheduled attempt.
- Treat an old source date as `stale`.
- Treat schema or invariant failures as `invalid`.
- Return structured per-source results from the endpoint.
- Earlier attempts may complete successfully even when a source is still pending.
- The final attempt returns a failing status when an expected source remains unresolved, making the GitHub Action fail and triggering configured GitHub notification email.
- The application displays the real last successful edition date and a stale badge; it never disguises yesterday’s ranking as today’s.
- Vercel logs include IDs, dates, states, durations, and error codes, but not fortune prose.

## 12. Authentication and endpoint security

### Private application

- Auth.js credentials flow accepts one configured prototype account.
- Store only a password hash in Vercel environment variables.
- Use secure, HTTP-only, same-site cookies.
- Protect all pages and read endpoints that return fortune content.
- Do not expose account registration.

### Ingestion endpoint

- `POST /api/internal/ingest` only.
- Require `Authorization: Bearer <INGEST_SECRET>`.
- Compare secrets using a timing-safe comparison.
- Keep matching secrets in Vercel and GitHub encrypted environments.
- Reject browser GET requests and unauthorized POST requests.
- Validate request fields (`attempt`, `source`, `force`) before execution.

## 13. User experience

The approved direction is a dark, high-energy, market-inspired rank experience rather than an analytics dashboard.

### Primary journey

1. User signs in.
2. User chooses a zodiac sign; the last choice is retained locally.
3. User selects **Ohaasa** or **Gogo** with a prominent global segmented toggle.
4. The complete page switches to that source.
5. The hero answers “What rank am I today?” with a large `#N / 12` result.
6. The page shows movement from the previous edition of the same source.
7. The rank race lists all 12 signs and highlights the user’s sign.
8. The fortune panel shows the comment, advice, and lucky fields.
9. History controls switch among 7-, 30-, and 90-day rank trends.

### Supporting elements

- Source comparison cards may show both current ranks, but never invent a combined rank.
- “Top-3 streak” counts real captured editions for the selected source.
- “Biggest mover” compares the current edition with the previous captured edition for that source.
- Trend charts use rank 1 at the top and rank 12 at the bottom.
- Missing Ohaasa weekend/holiday dates appear as gaps, not duplicated Friday values.
- New installations show a “Building history” state instead of fake trend data.
- Source and rank are expressed with text and numbers, not color alone.
- The interface must work at mobile widths and support keyboard source/sign selection.
- Market styling must not imply gambling, money, odds, or predictive certainty.

## 14. Query behavior

Server-side query functions provide:

- latest available edition for each source;
- edition and all ranks for a requested source/date;
- selected zodiac history for 7, 30, or 90 calendar days;
- previous available edition for movement calculation;
- top-three streak over captured editions;
- biggest rank mover between consecutive editions.

Queries return source dates explicitly. UI routes do not fetch broadcasters.

## 15. Testing strategy

### Unit tests

- zodiac mappings;
- JST target-date calculations around UTC day boundaries and New Year;
- Ohaasa weekday/weekend/holiday eligibility;
- Ohaasa tab parsing and lucky-hint extraction;
- Gogo date/rank/detail/score parsing;
- validator failures for missing, duplicate, unknown, and out-of-range records;
- movement and streak calculations.

### Integration tests

- successful atomic import of 12 rows;
- repeated import becomes `already_complete`;
- forced import replaces all 12 rows atomically;
- stale and invalid payloads do not create editions;
- one source can succeed while the other remains pending;
- final unresolved expected source causes a failing endpoint result;
- authentication and ingestion secrets are enforced.

Committed HTML/JSON fixtures use invented fortune prose and no broadcaster images.

### Browser tests

- private login gate;
- zodiac selection;
- Ohaasa/Gogo global source toggle updates the hero, race, fortune, and chart;
- all 12 ranks appear in the race;
- history range controls;
- building-history and stale states;
- keyboard operation;
- representative mobile viewport.

## 16. Deployment and operations

Required secrets and configuration:

### Vercel

- Neon database connection string
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- prototype username/password hash
- `INGEST_SECRET`
- optional contact string for the fetch user agent

### GitHub

- deployed ingestion endpoint URL
- matching `INGEST_SECRET`

Deployment order:

1. provision Neon;
2. apply migrations;
3. configure Vercel secrets;
4. deploy the application;
5. configure GitHub secrets;
6. run a manual ingestion;
7. verify both source results and UI privacy;
8. enable scheduled workflow;
9. confirm the next final-attempt failure notification path.

## 17. Acceptance criteria

The private prototype is ready when:

1. Gogo imports a valid current edition every calendar day by 09:00 JST under normal source availability.
2. Ohaasa imports a valid current edition by 09:00 JST on eligible ordinary weekdays and makes no request on excluded dates.
3. Imports are idempotent and store exactly 12 unique signs/ranks atomically.
4. Stale, malformed, or partial source responses never become a published edition.
5. The application requires authentication before exposing fortune content.
6. The global Ohaasa/Gogo toggle updates the entire rank experience.
7. The selected sign shows current rank, source-specific movement, rank race, fortune details, and real historical trends.
8. Ohaasa missing dates remain visible as gaps rather than copied records.
9. No source images or logos are stored or displayed.
10. Automated unit, integration, and browser tests pass.
11. GitHub Actions supports scheduled and manual ingestion and reports unresolved final attempts as failures.
12. Public release remains explicitly blocked pending rights review.

## 18. Approved decisions

- Private prototype first.
- Vercel Hobby plus a free external scheduler.
- GitHub Actions calls a protected Vercel ingestion endpoint.
- Neon Postgres stores history.
- Four bounded morning attempts complete by 09:00 JST.
- Ohaasa normal feed only; no weekend or holiday editions.
- Gogo every day.
- No dedicated horoscope RSS exists; use Ohaasa JSON and Gogo HTML.
- Market-inspired “What rank am I?” interface.
- Prominent global Ohaasa/Gogo source toggle.
- No combined rank, fake probability, or betting functionality.
