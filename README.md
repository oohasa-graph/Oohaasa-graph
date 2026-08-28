# Oohaasa / Gogo Fortune Rank Market

Owner-approved public-viewing prototype for daily zodiac ranking history from Ohaasa and Gogo. The app stores each source independently and presents ranks in a dark market-style interface without combined ranks, odds, betting, probabilities, broadcaster images, or logos.

Internal ingestion remains protected by a bearer secret. Re-check content rights before broader promotion or commercial launch.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Neon Postgres with Drizzle ORM
- NextAuth 4 dependency retained, but `/` is public
- Vitest, PGlite, Testing Library, Playwright
- GitHub Actions scheduler for Vercel Hobby deployments

## Local setup

```bash
npm ci
cp .env.example .env.local
```

Fill `.env.local` with database and ingestion values. Auth variables are optional unless you re-enable private routes/tests.

Run locally:

```bash
npm run dev
```

The public app is served at `/`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright uses `DATA_FIXTURE_MODE=1` through `playwright.config.ts` and never fetches live source content.

## Database

Generate and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

Use Neon for production `DATABASE_URL`; PGlite is used only for tests.

## Ingestion

GitHub Actions calls the protected Vercel endpoint:

```http
POST /api/internal/ingest
Authorization: Bearer $INGEST_SECRET
Content-Type: application/json

{ "attempt": "primary", "source": "all", "force": false }
```

Scheduled attempts are 05:15, 06:15, 07:45, and 08:50 JST via UTC crons in `.github/workflows/ingest.yml`. Ohaasa is skipped on weekends and Japanese public holidays; Gogo is expected daily.

See `docs/operations.md` for provisioning, scheduler secrets, manual recovery, and stale/invalid diagnosis.
