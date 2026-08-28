# Operations Runbook

## Status

This is a private prototype. Keep authentication enabled and public access disabled until content-rights review approves any broader launch.

## Provision Neon

1. Create a Neon project and Postgres database.
2. Copy the pooled connection string into Vercel as `DATABASE_URL`.
3. Apply migrations from a trusted local/CI environment:
   ```bash
   npm ci
   npm run db:migrate
   ```
4. Confirm the generated schema contains `editions`, `fortune_entries`, and `ingestion_runs` with source/date, sign, and rank constraints.

## Vercel environment variables

Set these in the Vercel project:

- `DATABASE_URL`
- `INGEST_SECRET` — long random value shared only with GitHub Actions.
- `SOURCE_USER_AGENT` — identifying user agent with contact information.
- `PRIVATE_USERNAME`
- `PRIVATE_PASSWORD_HASH` — bcrypt hash, not the plaintext password.
- `NEXTAUTH_SECRET` — at least 32 random characters.
- `NEXTAUTH_URL` — production deployment URL.
- `DATA_FIXTURE_MODE=0` or unset. Never set `DATA_FIXTURE_MODE=1` in production; the app throws if fixture mode is requested while `NODE_ENV=production`.

## GitHub scheduler secrets

In the repository or environment used by `.github/workflows/ingest.yml`, set:

- `INGEST_URL` — `https://<vercel-domain>/api/internal/ingest`
- `INGEST_SECRET` — exactly the same value configured in Vercel.

The workflow must not print either value. It calls the endpoint with `curl --fail-with-body --silent --show-error`.

## Schedule

The workflow runs four bounded attempts per Japanese day:

| JST | UTC cron | attempt |
| --- | --- | --- |
| 05:15 | `15 20 * * *` | `primary` |
| 06:15 | `15 21 * * *` | `retry_1` |
| 07:45 | `45 22 * * *` | `retry_2` |
| 08:50 | `50 23 * * *` | `final` |

Manual runs use `attempt=manual` and can choose `source=all|ohaasa|gogo` and `force=true|false`.

## Manual ingestion and force recovery

Use GitHub Actions `workflow_dispatch` first. Choose:

- `source=all`, `force=false` for normal recovery.
- `source=ohaasa` or `source=gogo` for a single source.
- `force=true` only when replacing a same-day committed edition after reviewed source/parser correction. Force bypasses idempotency only; parser and validation still run.

A successful response contains one terminal result per selected source and does not include fortune prose.

## Final-attempt notification behavior

The protected API returns HTTP 424 on the `final` attempt if any selected expected source remains:

- `stale`
- `invalid`
- `fetch_error`

The following statuses are terminal and do not fail final attempts:

- `success`
- `already_complete`
- `not_expected`

Ohaasa can be `not_expected` on weekends and Japanese public holidays. Gogo is expected daily.

## Diagnose stale, invalid, and fetch errors

- `stale`: source date did not match the Asia/Tokyo target date. Do not relabel old data as current.
- `invalid`: parser or validator rejected the source shape, duplicate signs/ranks, missing required fields, or unknown source tokens.
- `fetch_error`: HTTP/network/JSON/text read failure. Run records store only constrained error codes and fixed summaries.

Do not paste full source bodies or copied fortune prose into logs, issues, or failed-run records. Use structural symptoms, status codes, source date labels, parser version, and content hashes.

## Source drift

The source contracts are undocumented and may drift:

- Ohaasa uses `https://www.asahi.co.jp/data/ohaasa2020/horoscope.json` on ordinary weekdays only.
- Gogo parses `https://www.tv-asahi.co.jp/goodmorning/uranai/` daily.

If HTML/JSON tokens change, ingestion should fail closed. Update invented fixtures and parser tests first, then make the minimal parser change.

## Deployment smoke test

After deployment:

1. Confirm unauthenticated `/` redirects to `/login`.
2. Sign in with the configured private account.
3. Trigger GitHub Actions `workflow_dispatch` with `source=all`, `force=false`.
4. Confirm the response has one terminal result per source and no fortune prose.
5. Confirm Ohaasa/Gogo switching updates the hero, race, trend chart, metrics, and fortune panel.
6. Confirm displayed edition dates match persisted Japanese source dates.
7. Confirm no source images/logos appear.
8. Leave public access disabled pending rights review.
