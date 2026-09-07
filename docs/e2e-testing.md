# End-to-end tests

The Playwright suite in `e2e/` drives a real browser against a full local stack:
the Express backend, the Next.js web app, Supabase Auth and Postgres, and
S3-compatible object storage.

This repository ships **no CI workflows**, so the suite runs where you run it.
This document covers what it needs, how to run it, and what a continuous
integration job would have to do if you add one.

## Running the suite locally

`playwright.config.ts` starts the backend and web servers for you when `CI` is
unset, so a running local stack plus these three commands is the whole setup:

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e            # or test:e2e:ui / test:e2e:headed
```

`e2e/auth.setup.ts` reads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from the
environment or from `backend/.env`, so a running local Supabase and a populated
`backend/.env` is all the configuration the suite needs. See
[Local development](local-development.md) for bringing the stack up, and
[Safe local testing](safe-local-testing.md) for keeping test data disposable.

`scripts/e2e-local-stack.sh` (`npm run test:e2e:local`) provisions the stack and
runs the suite in one step.

## What a full run requires

1. Root, `backend/`, and `frontend/` dependencies installed.
2. **S3-compatible object storage** — several specs upload documents.
3. **Local Supabase** (Auth and Postgres), loaded with the current fresh-install
   shape from `backend/schema.sql`. Do not replay historical migrations on top
   of it: doing so can replace current functions with older definitions.
4. `backend/.env` and `frontend/.env.local` written from the live Supabase
   values.
5. The backend built, and the workflow catalog ingestion job
   (`npm run sync:workflows --prefix backend`) run against it, matching
   production ordering so the default and add-on catalog exists before startup.
   The suite also passes against an empty catalog: no spec depends on seeded
   catalog entries, and `workflows-settings.spec.ts` creates its own.
6. The web app served as a **production build** (`next build` then `next start`),
   not `next dev`. The dev server's on-demand route compilation makes the first
   hit of each page slow enough to time out `waitForResponse` assertions, and
   its hydration-error overlay injects DOM that pollutes text locators.
7. The backend on `:3001` and the web app on `:3000`, both answering before
   Playwright starts.

`e2e/auth.setup.ts` bootstraps the shared test user (`e2e@accelerate.local`)
through the local Supabase admin API, so no login secret is needed — the
credentials in that file are the single source of truth.

## Expected result

A keyless run ends **27 passed / 4 skipped / 0 failed**: the suite has 31 tests,
4 of them gated on a model key. Treat the Playwright summary as the source of
truth if tests are added or removed.

## Model-gated specs

Four specs (chat rename, delete, submit, and the critical-path "ask a question")
send a message and assert a streamed answer. They gate themselves on
`ANTHROPIC_API_KEY` through `e2e/llm.ts`:

| State | Behavior |
| --- | --- |
| Key set | The 4 specs run and are enforced. |
| No key | The 4 specs **skip** with the reason `requires a model key`, and the run is still green on the other 27. |

Skipping rather than hanging is deliberate: it keeps keyless runs green and
fast. Accelerate Legal supports keyless local models through Ollama, but the
suite does not provision an Ollama server or pull a model, so without a provider
key the live-response specs have no model available and must skip. Automatic
title generation is not the reason for the gate; failures there are already
treated as best-effort.

Cost with a key set is a handful of short completions — one streamed answer per
gated spec plus a few 64-token title generations — on the order of a few cents
per run.

To confirm the specs actually ran rather than skipped, check the summary: a
keyless run reports `4 skipped` and each skipped spec carries the
`requires a model key` reason, while a keyed run reports `31 passed` with no
`skipped` line.

### Model selection

When a key is present, the shared `selectClaudeModel` helper picks a supported
Anthropic model before each gated test submits. The assertions check for a
nonempty streamed assistant answer rather than provider-specific text. Keep that
helper in step with the current model catalog when model ids or display names
change.

## Accessibility scans

`e2e/accessibility.spec.ts` runs an
[axe-core](https://github.com/dequelabs/axe-core) scan (through
`@axe-core/playwright`) over `/login` (pre-auth), `/assistant`, `/projects`, and
`/tabular-reviews`. The policy is two-tier: **`critical`-impact violations fail**,
while `serious`-impact violations are printed but do not fail. Clear the
`serious` backlog, then ratchet it into the failing tier by editing
`BLOCKING_IMPACTS` in the spec. These scans need no model key.

## Failure artifacts

Playwright retries a failed spec up to twice when `CI=true` and records a
**trace** on the first retry (`retries` and `trace: "on-first-retry"` in
`playwright.config.ts`). Results land in `playwright-report/` and
`test-results/`; both are gitignored. Open them with:

```bash
npx playwright show-report playwright-report
```

That gives per-spec results, screenshots, and a step-by-step trace of what the
browser did.

## If you add a CI job

The workflows that used to run this suite were removed from this repository. A
replacement job needs to reproduce the seven requirements above, and three
details are worth carrying over:

- **Set `CI=true`.** `playwright.config.ts` disables its own `webServer` only
  when `CI` is set, so the job must start the backend and web servers itself.
  Without it, Playwright and the job both try to bind the same ports.
- **Upload `playwright-report/` and `test-results/` unconditionally**, including
  on timeout — that is exactly when the traces are needed.
- **Fork pull requests get no repository secrets.** A model key stored as a
  secret will be absent there, so fork runs skip the 4 gated specs. That is by
  design and keeps those runs green.

To make such a check block merges, it is not enough for it to fail: enable
**Settings → Branches → branch protection** on `main`, turn on *Require status
checks to pass before merging*, and add the job by name once it has run at least
once.
