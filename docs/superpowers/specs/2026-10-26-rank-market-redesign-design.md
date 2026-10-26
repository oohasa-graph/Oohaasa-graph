# Rank Market Redesign: Kawaii Market Views, Languages, and History Data

Date: 2026-10-26
Status: Draft for owner approval
Prototype: [`2026-10-26-rank-market-redesign-prototype.html`](2026-10-26-rank-market-redesign-prototype.html) (open in a browser; invented data)
Builds on: [`2026-08-26-oohaasa-gogo-fortune-graph-design.md`](2026-08-26-oohaasa-gogo-fortune-graph-design.md)

## 1. Intent

The site tracks the daily zodiac rankings from two Japanese morning shows, Ohaasa (ABC) and Gogo (TV Asahi). It already works end to end, but the owner finds it boring. The point of the site is **fun**: treat the twelve signs like stocks and let people follow how their sign has been doing over time.

The redesign has two halves:

1. **Look and feel.** A stock-market page, focused on rank history, styled with the warm, cute feel of a Japanese morning-TV horoscope corner. The owner explicitly wants "real Japanese cute", not generic cartoon clip art.
2. **History data.** History is the product, but the database currently holds real rankings for only one day (2026-10-26). Every earlier scheduled run failed (`invalid` or `fetch_error`) until the parser and Tokyo-region fixes landed on 2026-10-26. The redesign is only worth it if the charts have history to show, so this design also covers keeping, mirroring, and backfilling data.

## 2. Goals, non-goals, anti-goals

### Goals

- A main page that reads like a trading screen for zodiac signs, with rank history front and center.
- A second "market board" view for the whole market over time, opened by clicking the main chart.
- Japanese, English, and Korean interface text.
- Years of past rankings imported from the free Wayback Machine, shown honestly with gaps.
- A complete private copy of every edition (fortune text included) in a private GitHub repository.

### Non-goals

- Translating the daily fortune text. It stays in Japanese in every language.
- New fortune sources, user accounts, notifications, or social features.
- Any paid service, paid plan, or paid API.

### Anti-goals (failure even if it technically works)

- Childish or generic "cutie" styling. The reference is the prototype: soft, rounded, Japanese stationery and morning-TV feel.
- Using the shows' own mascots or artwork (for example Gogo's Gochan). Characters must be original.
- Fortune text appearing anywhere public: the public repository, Actions logs, or diagnostics.
- Inventing data: interpolating missing mornings or showing a guessed rank as real.

## 3. Constraints

- **No payment.** Vercel Hobby, Neon free tier, GitHub free plan. The GitHub spending limit stays at $0.
- **Vercel function region stays `hnd1` (Tokyo).** Gogo returns HTTP 406 outside Japan since 2026-10-21; only the Tokyo function can fetch it.
- **The main repository and its Actions logs are public.** Never log or commit fortune prose there. Ranks, scores, and winner categories are facts and may appear.
- **Existing ingestion keeps working unchanged**: schedule, validation, idempotency, statuses, and the text-free failure diagnostic.
- **Next.js 16 differs from older versions.** Read the relevant guide in `node_modules/next/dist/docs/` before writing app code (see `AGENTS.md`).
- Must work at phone width (single column, no horizontal page scroll).
- **No new Vercel environment variables.** The owner's Vercel plan blocked adding one, so new features reuse the existing `DATABASE_URL` and `INGEST_SECRET`.
- **No manual owner steps.** Schema changes apply automatically during the production build (§6.5). GitHub-side setup (private repo, deploy key, secrets) is done with the agent's org-admin access.

## 4. Decided by the owner

These come from the brainstorming conversation on 2026-10-26 and match the prototype.

1. **Two views.** The main page is the "cute trading terminal" (prototype view A). Clicking the main rank chart opens the "market board" (view C). Back returns to the main page.
2. **Japanese cute style**, as in the prototype: cream background with soft polka dots, rounded Japanese type, warm brown ink instead of black, pastel sign colors, round rank stickers (gold, silver, bronze for 1–3), red hanko-style stamp labels, and original round "mochi" characters per sign whose face changes with rank.
3. **The site opens on the main rank page in Japanese.** No language page on entry.
4. **A language page** with English, 日本語, and 한국어, opened from a button in the top bar. Choosing a language returns to the page the visitor came from.
5. **Interface text is translated; fortune text from the shows stays Japanese.**
6. **Storage: option 2.** Neon Postgres remains the store the site reads. A separate **private** GitHub repository keeps a full copy of every edition, fortune text included.
7. **Backfill older rankings from the Wayback Machine.**

## 5. The experience

The prototype is the visual reference for layout, styling, and behavior. This section states what must be true; exact spacing and polish follow the prototype.

### 5.1 Shared state

Every view shares: selected **sign** (default: libra, as today), **source** (Ohaasa or Gogo; default Ohaasa), and **range**. Moving between views keeps all three.

### 5.2 Top bar (all views)

Site name, a breadcrumb (メイン, or メイン › 市場ボード), and a language button showing the current language (for example `あ/A 日本語 ▾`) that opens the language page.

### 5.3 Main page: うらない証券取引所 (view A)

- **Ticker tape:** a slowly scrolling pink strip with every sign's small mochi face, ticker code, today's rank, and change since the previous morning.
- **Header:** brand, JST clock, source switch, range switch.
- **Watchlist (今日の銘柄):** all twelve signs sorted by today's rank: mochi face, sign name, rank sticker, change pill (pink ▲ up, blue ▼ down, neutral for no change), a sparkline over the selected range, and best/worst rank in the range. Clicking a row selects that sign.
- **Rank chart (順位チャート):** the selected sign's big mochi, name, today's rank, change, and a speech bubble with a short mood line chosen by rank bucket (our own text, translated per language, never source text). The chart shows the sign's rank over the range (rank 1 at the top), the same sign's rank on the other show as a faint dotted line, and a ★ above each #1 morning. The chart area shows a hint ("タップで市場ボードへ ↗") and **clicking anywhere on it opens the board**.
- **Range stats:** average rank, best/worst, number of #1 mornings, and volatility (standard deviation), each with a hanko label.
- **Today's fortune card (今日の運勢):** the selected sign's fortune for today from the selected source, in Japanese. Ohaasa shows the comment and lucky hint; Gogo shows the comment, lucky color, lucky key, the four category scores as small icon rows, and any #1 category badges. (See §8, my call 1.)
- **Bottom row:** 急上昇 (top gainers today), 急降下 (top losers today), 連続トップ3 (current consecutive top-3 streaks). Clicking a sign selects it.

### 5.4 Market board: 星座ランキング市場 (view C)

- Back button (← メインへ) and the same source and range switches.
- **Award cards:** 今週のMVP (biggest improvement: average rank of the last 5 mornings vs the 5 before), がんばれ賞 (biggest drop on the same measure), 1位王 (most #1 mornings in the last 3 months), 安定株 (best average rank over the last 3 months). Each shows the sign's mochi and a hanko label. Clicking selects the sign.
- **Rank race (順位レース):** all twelve signs' ranks over the range as crossing lines in pastel sign colors. The selected sign is thick and on top; the others are faded. Each line ends with that sign's mochi face. Clicking a face or a legend chip selects the sign.
- **Stamp calendar (スタンプカレンダー):** one row per sign, one round stamp per morning over the last 3 months. Pink means near the top, blue near the bottom, ★ marks #1. Missing mornings show as empty stamps.

### 5.5 Language page

Three bobbing mochi, the title, "choose your language" in all three languages, and three large buttons (English / 日本語 / 한국어, each with a greeting). The current language is highlighted. There is a back button. The choice is remembered for the visitor's browser.

### 5.6 Languages

- Japanese is the default on a first visit, regardless of browser language.
- Each section heading carries a small second-language label: Japanese under English and Korean, English under Japanese.
- Rank formats: `#3` (English), `3位` (Japanese), `3위` (Korean).
- Sign names per language (Korean: 양자리, 황소자리, 쌍둥이자리, 게자리, 사자자리, 처녀자리, 천칭자리, 전갈자리, 궁수자리, 염소자리, 물병자리, 물고기자리).
- Show names: Ohaasa / おはあさ / 오하아사; Gogo / ゴーゴー / 고고.
- Korean text must look as rounded and as bold as the Japanese. The prototype's Gowun Dodum is too thin for headings.

### 5.7 Mochi characters

Original SVG characters: a round mochi body in the sign's pastel color, a faint sign glyph, and pink cheeks. Face by today's rank:

| Rank | Face |
|---|---|
| 1 | happy arcs, open smile, gold crown and sparkle |
| 2–3 | happy arcs, open smile |
| 4–9 | dot eyes, "ω" mouth |
| 10–12 | droopy eyes, small frown, sweat drop |

### 5.8 History honesty

- The time axis uses the mornings a show is **expected** to publish, from the existing `isSourceExpected` rule: Ohaasa skips weekends and Japanese holidays, like a stock market with no trading days; Gogo is daily.
- An expected morning with no stored edition is a **gap**: lines break, and stamps are empty. Never interpolate.
- Stats use only mornings with data and show coverage, for example "18/21 mornings".
- If the latest edition is not today's, show the existing stale-data status (data date in JST).

## 6. History data

### 6.1 Daily collection (unchanged)

GitHub Actions in the public repo triggers four bounded attempts each morning (05:15–08:50 JST). The Tokyo Vercel function fetches and validates each source and saves editions to Neon. This keeps working as-is and builds history from 2026-10-26 forward.

### 6.2 Private data repository (owner option 2)

- A new **private** repository, `oohasa-graph/Oohaasa-graph-data` (my call on the name), holds one JSON file per show per edition date, for example `editions/gogo/2026/2026-10-26.json`. Each file contains every stored field (rank, comment, advice lines, lucky fields, scores, winner categories) plus provenance: origin (`live` or `wayback`), Wayback snapshot URL when relevant, fetched time, parser version, and content hash.
- **Who writes it:** a scheduled **export workflow in the public repo**, which already holds `INGEST_SECRET`. It runs after the final daily attempt, around 09:30 JST.
- **What it does:**
  1. Calls a new **read-only export endpoint** on the app. The endpoint is authenticated with the existing `INGEST_SECRET` and returns recent editions (last 14 days, my call).
  2. Writes the JSON files into a checkout of the private repo.
  3. Commits only when files changed, then pushes.
- **How it pushes:** with a write **deploy key** on the private repo. The private half is stored as the public repo's `DATA_REPO_DEPLOY_KEY` secret.
- **Full export:** a manual run can export everything, for use after a backfill.
- **Log rule:** the workflow handles fortune text inside the runner, just as today's ingest workflow already handles full source pages. It must **never print it**: no echoing response bodies, and no `git diff` or `git show` of data files. Logs show dates and counts only.
- **Why not a separate export secret:** a separate key for reading would be cleaner, but it would need a new Vercel environment variable, which the owner's plan blocked. Whoever holds `INGEST_SECRET` can already write editions, so letting it also read them adds no new exposure.
- **Cost:** the private repo runs no workflows, and the public repo's Actions minutes are free.

### 6.3 Backfill from the Wayback Machine

- **What exists** (CDX API, status 200, checked 2026-10-26): Ohaasa `horoscope.json` on about 116 days (2020–2026, 45 since 2026-07-01); Gogo `uranai/` on about 526 days (2013–2026, 58 since 2026-07-01). Coverage is sparse.
- **Which snapshots today's parsers can read:**
  - Ohaasa has the same JSON shape in every sample from 2021 through 2026.
  - Gogo has had today's markup (12 `rank-N.png`, `lucky-color-txt`, `key-txt`, `number-one-*` items) since about **June 2021**. Monthly samples through May 2021 lack it, and some older pages are Shift_JIS-encoded.
  - Usable backfill is therefore about **250 Gogo and 115 Ohaasa mornings** from mid-2021 on.
  - Snapshots are served gzip-compressed and must be decompressed.
  - Snapshots that fail parsing or validation are skipped and counted. No legacy parsers are written for the pre-June-2021 Gogo layout (my call).
- **Gogo publishes daily, weekends included:** archived Saturday and Sunday pages carry that day's own date. The existing `isSourceExpected` rule (Gogo daily; Ohaasa weekdays except Japanese holidays) is correct and unchanged.
- **Edition date comes from the content.** Ohaasa: `onair_date`. Gogo: the page's 月/日（曜日） label, with the year inferred from the snapshot timestamp (the existing weekday check removes ambiguity). Example: a snapshot taken 2025-06-01 UTC shows the 6/2 edition.
- **Same pipeline:** each snapshot goes through the existing parser and validation and is saved to Neon with origin `wayback`. **A live edition always wins**: backfill never overwrites an existing edition for that show and date. When several snapshots exist for one date, use the first that validates.
- **Run as a manual GitHub Actions workflow** with a date-range input. Pacing is at most one Wayback request per second. It is resumable, because already-stored dates are skipped. Logs show counts and dates only, never text.
- After backfill, run the private repo's full export once so the GitHub copy matches Neon.

### 6.4 Read model

The current read path caps history at 90 days. It must serve the new ranges (1W, 1M, 3M, ALL; see my call 2) per source, including the expected-morning axis and gap information, without loading years of fortune text for chart views. ALL starts at the earliest stored edition for the selected source (mid-2021 after backfill) and will be mostly gaps before 2026-10-26; that is expected and shown honestly.

### 6.5 Schema changes

Backfill needs an edition origin (`live` or `wayback`), the snapshot URL, and a `backfill` ingestion attempt value. Migrations run **automatically during the Vercel production build**, before the new code serves traffic. The build script runs `drizzle-kit migrate` only when `VERCEL_ENV` is `production`. Preview builds skip it, because they have no production `DATABASE_URL`. Migrations must be additive, so a failed deploy leaves the running site working.

## 7. Testing and verification

- **Unit:** mood bucket and face selection; award and streak metrics; the expected-morning axis and gap handling; that every interface string exists in all three languages; Wayback edition-date derivation, including the cross-midnight case; export endpoint auth (rejects a missing or wrong secret; is read-only); the migrate-on-build script skipping non-production builds.
- **Parser fixtures:** add invented-text fixtures that mirror archived layouts. Never commit archived fortune text to the public repo.
- **Playwright e2e:**
  1. A first visit opens the main page in Japanese.
  2. Clicking the chart opens the board with the same sign, source, and range.
  3. Back returns to the main page.
  4. The language page switches to Korean and returns to the previous view.
  5. Gaps render without errors.
  6. The page works at phone width.
- **Live checks after deploy:** the daily ingest still succeeds; one backfill run reports counts; the private repo receives files; the public Actions logs contain no fortune text.

## 8. Calls I made (owner please check)

1. **Today's fortune card on the main page.** The prototype doesn't show the shows' fortune text, but the current site does and the owner confirmed it stays Japanese. I kept it as a card under the chart.
2. **Ranges are 1W, 1M, 3M, and ALL.** ALL is new; it makes sense once years of Wayback history exist. The stamp calendar stays at 3 months.
3. **Gaps break the line** rather than connecting across missing mornings, and coverage counts are shown.
4. **Data repo name** `Oohaasa-graph-data`, export window of 14 days, export around 09:30 JST.
5. **No legacy parsers** for archived layouts that differ from today's (Gogo before about June 2021). They are skipped and counted.
6. **The language choice is remembered per browser.** Mechanism left to the builder; it must work with server rendering, so a cookie is likely.
7. **Pink is up and blue is down**, matching the prototype and Korean and Japanese app habits.
8. **Views have their own URLs** carrying sign, source, and range, so browser back and shared links work.
9. **The export reuses `INGEST_SECRET` and pushes with a deploy key from the public repo's Actions**, because a new Vercel variable wasn't possible (§6.2).
10. **Database migrations run in the Vercel production build**, so no one has to run them by hand (§6.5).

## 9. Left to the builder

- Component structure, and whether charts stay hand-built SVG (as in the prototype) or use a library.
- Font loading (`next/font`), and the Korean font that meets §5.6.
- Exact URL paths and query parameter names, and the language storage mechanism.
- JSON file schema details in the data repo, and the export endpoint's request and response shape.
- Backfill mechanics: whether the runner or the Tokyo function fetches Wayback, and how the ingest endpoint receives an explicit target date for `backfill` attempts.
- Animation and transition details (the prototype uses a short pop-in between views and a bobbing hero).

## 10. Acceptance criteria

1. A first visit to the site shows the main page in Japanese with real data, mochi faces, ticker, watchlist, chart, stats, today's fortune card, and the gainers/losers/streaks row.
2. Clicking the main chart opens the market board with the same sign, source, and range. Back, both the in-page button and the browser button, returns to the main page.
3. The language page is reachable from the top bar, switches all interface text between Japanese, English, and Korean, and returns to the previous view. Fortune text stays Japanese.
4. The Wayback backfill has run. Neon holds every archived edition that passed validation, marked `wayback`, and charts show it with honest gaps.
5. The private data repo exists and receives daily files with full fields. No fortune text appears in the public repo or its Actions logs.
6. The daily ingestion still succeeds for both shows from the Tokyo function.
7. Lint, typecheck, unit tests, build, and Playwright e2e pass in CI.
8. Nothing paid was enabled, no new Vercel environment variable was needed, and the owner did no manual setup.
