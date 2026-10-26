# Operations Runbook

## Status

The rank UI is public-viewing by owner approval. Keep the internal ingestion endpoint secret-protected, and re-check content rights before broader promotion or commercial launch.

## Provision Neon

1. Create a Neon project and Postgres database.
2. Copy the pooled connection string into Vercel as `DATABASE_URL`.
3. Production Vercel builds apply committed migrations automatically before `next build`. See [Migrations](#migrations).
4. Confirm the generated schema contains `editions`, `fortune_entries`, and `ingestion_runs` with source/date, sign, and rank constraints.

## Vercel environment variables

Set these in the Vercel project:

- `DATABASE_URL`
- `INGEST_SECRET` — long random value shared only with GitHub Actions.
- `SOURCE_USER_AGENT` — identifying user agent with contact information.
- `DATA_FIXTURE_MODE=0` or unset. Never set `DATA_FIXTURE_MODE=1` in production; the app throws if fixture mode is requested while `NODE_ENV=production`.

Optional only if private routes are re-enabled later:

- `PRIVATE_USERNAME`
- `PRIVATE_PASSWORD_HASH` — bcrypt hash, not the plaintext password.
- `NEXTAUTH_SECRET` — at least 32 random characters.
- `NEXTAUTH_URL` — production deployment URL.

## GitHub scheduler secrets

In the repository or environment used by `.github/workflows/ingest.yml`, set:

- `INGEST_URL` — `https://<vercel-domain>/api/internal/ingest`
- `INGEST_SECRET` — exactly the same value configured in Vercel.

The workflow must not print either value or raw source content. The GitHub runner fetches each selected source and sends it as `sourceBody` in a separate authenticated request, so Vercel does not need access to the source site. If the runner cannot fetch a source, the request omits `sourceBody` and the endpoint tries its own fetch; the final attempt still fails if the source remains unresolved. The endpoint validates the date and all 12 ranks before saving. It calls the endpoint with `curl --fail-with-body --silent --show-error`.

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

The protected API returns HTTP 424 on `final` and `manual` attempts if any selected expected source remains:

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
- `fetch_error`: HTTP/network/JSON/text read failure from both the runner and the endpoint. Run records store only constrained error codes and fixed summaries.

Do not paste full source bodies or copied fortune prose into logs, issues, or failed-run records. Use structural symptoms, status codes, source date labels, parser version, and content hashes.

## Source drift

The source contracts are undocumented and may drift:

- Ohaasa uses `https://www.asahi.co.jp/data/ohaasa2020/horoscope.json` on ordinary weekdays only.
- Gogo parses `https://www.tv-asahi.co.jp/goodmorning/uranai/` daily.

If HTML/JSON tokens change, ingestion should fail closed. Update invented fixtures and parser tests first, then make the minimal parser change.

## Deployment smoke test

After deployment:

1. Confirm public `/` shows the rank-market UI without sign-in.
2. Trigger GitHub Actions `workflow_dispatch` with `source=all`, `force=false`.
3. Confirm the response has one terminal result per source and no fortune prose.
4. Confirm Ohaasa/Gogo switching updates the hero, race, trend chart, metrics, and fortune panel.
5. Confirm displayed edition dates match persisted Japanese source dates.
6. Confirm no source images/logos appear.
7. Keep `/api/internal/ingest` protected by `INGEST_SECRET`.

## Migrations

`npm run build` runs `scripts/migrate-on-deploy.ts` before Next.js. It applies migrations only when `VERCEL_ENV=production`, using the existing `DATABASE_URL`. Local and preview builds skip migrations. A migration error fails the build.

Migrations must be additive. Inspect generated SQL before pushing. Never remove columns or enum values needed by the currently serving deployment. Keep `vercel.json` pinned to `hnd1`: Gogo rejects requests from outside Japan.

## Private data mirror

The private repository is `oohasa-graph/Oohaasa-graph-data`. It runs no workflows. The public repository's `export-data.yml` exports the last 14 JST dates at 09:30 JST and commits only changed files to the private repository.

The read-only `/api/internal/export?from=YYYY-MM-DD&to=YYYY-MM-DD` endpoint uses the existing `INGEST_SECRET`. No new Vercel variable is needed. Requests are limited to 400 dates; the workflow splits full exports into windows of at most 366 dates.

To export all stored history after a backfill:

```bash
gh workflow run export-data.yml --repo oohasa-graph/Oohaasa-graph \
  --ref feature/fortune-graph-app -f from=2021-01-01
```

Files contain full editions and provenance at `editions/<source>/<year>/<date>.json`. Never print their contents, diffs, or error payloads to public logs. The writer reports counts only.

### Deploy key setup and rotation

The workflow needs a write deploy key on the private repository and the matching `DATA_REPO_DEPLOY_KEY` Actions secret on the public repository. Use a private temporary directory. Never print either half of the key in public logs.

```bash
scratch=$(mktemp -d)
chmod 700 "$scratch"
trap 'rm -f "$scratch/key" "$scratch/key.pub"; rmdir "$scratch"' EXIT
ssh-keygen -q -t ed25519 -N "" -C oohaasa-graph-export -f "$scratch/key"
gh repo deploy-key add "$scratch/key.pub" \
  --repo oohasa-graph/Oohaasa-graph-data --allow-write \
  --title "export from Oohaasa-graph"
gh secret set DATA_REPO_DEPLOY_KEY --repo oohasa-graph/Oohaasa-graph < "$scratch/key"
```

After a successful export with the replacement key, list old keys with `gh repo deploy-key list --repo oohasa-graph/Oohaasa-graph-data` and remove the retired key by ID. Do not revoke the working key before its replacement is verified.

Setup checkpoint (2026-10-26): the private repository exists, but GitHub rejected key creation with `Deploy keys are disabled for this repository`. No key or Actions secret was installed. Get owner approval before changing repository or organization security policy.

## Wayback backfill

Use the manual workflow on the implementation branch:

```bash
gh workflow run backfill.yml --repo oohasa-graph/Oohaasa-graph \
  --ref feature/fortune-graph-app \
  -f source=all -f from=2026-10-01 -f to=2026-10-25
```

Start with this small window. After it succeeds, import `2021-06-01..2026-09-30`, then run a full private export. Expected usable coverage is roughly 250 Gogo and 115 Ohaasa mornings in total, not continuous daily history.

The runner requests at most one Wayback resource per second. Invalid or unavailable snapshots are counted and skipped. Existing editions are never overwritten, even with `force`. Re-running is safe. Logs contain sources, timestamps, dates, statuses and counts only.

The daily ingestion workflow, statuses, schedules, and final/manual HTTP 424 behavior are unchanged. Backfill attempts report HTTP 200 with a recorded status; POST failures fail the runner.
