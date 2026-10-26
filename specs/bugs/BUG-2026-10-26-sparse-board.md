# Sparse rankings look broken on the market board

## Problem and verified cause

The production one-month board contains 7/20 Ohaasa mornings, while the local fixture contains 18/20. Feeding production rank-only data into the local board produces a byte-identical race-chart screenshot. Isolated unselected rankings are drawn as tiny faded path caps. Selected empty calendar stamps receive the same dark ring as recorded stamps. Header range controls do not explain that the calendar stays at three months.

Security impact: NONE; no security exploit path identified. Risk: low. Keep expected-morning gaps and all source fortune text unchanged. No backend, award-policy, deployment or dependency changes.

## Approved fix / TDD plan

1. RED: isolated unselected rankings must have visible markers on short and long ranges, without lines crossing missing mornings. GREEN: explicit circles for isolated points, retaining existing selected-point and line-density behavior.
2. RED: browser-computed selected empty stamps must have no solid ring, unlike recorded selected stamps. GREEN: restrict the ring to recorded stamps; retain a dashed empty state and the selected row label.
3. RED: switching chart periods updates its localized period label while the calendar remains explicitly three months. GREEN: reuse existing translated period labels.
4. Add an invented sparse fixture with the production one-month missingness pattern and a development-only fixture mode, protected against production use. Exercise sparse chart markers, missing stamps, range labels and mobile overflow in browser tests and CI.

## Acceptance

- [x] All signs retain visible isolated observations; missing mornings are not connected.
- [x] Selected missing calendar cells remain dashed, without a solid ring.
- [x] Japanese, English and Korean labels distinguish chart period from fixed calendar period.
- [x] Sparse and dense browser checks, unit tests, lint, typecheck and build pass.
- [x] No production mutation or deployment is implied by local verification.

## Resolution / evidence

- Unit: `npm test -- --maxWorkers=2` — 179 passed across 31 files. The first unconstrained run alongside browser checks hit two existing 5-second PGlite timeouts; repeated two-worker runs passed without increasing timeouts.
- Dense browser suite: 29 passed; 3 intentional skips (two sparse-mode cases run separately and one desktop-only exclusion of a phone check).
- Sparse browser suite: 4 passed (desktop and mobile); CI now runs these separately with `DATA_FIXTURE_MODE=sparse`.
- Lint, typecheck, production build and `git diff --check` passed. Local browser runs use installed Chrome because the bundled Chromium revision is absent; CI installs bundled Chromium.
- Also fed the previously captured production rank-only projection into the updated local component at widths 1440 and 390. Verified Ohaasa 1m, Gogo 1w and multi-year ALL; genuine gaps retained, visible singleton markers, no page errors or horizontal page overflow. Screenshots and checks: `/tmp/oohaasa-history-fixed/`, `/tmp/oohaasa-sparse-fixed-check.cjs` (temporary evidence, not a production data fixture).
- Local verification only: no commit, push, deployment or database mutation. Existing `.omc/` and `src/.omc/` left untouched. The original fixture preview remains available at port 3123; the temporary sparse test server was managed and stopped by Playwright.
