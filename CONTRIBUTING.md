# Contributing

Thanks for helping improve Accelerate Legal. Keep contributions small, focused,
and easy to review.

`AGENTS.md` is the detailed guide to this repository's structure and
conventions — where code belongs, the UI primitive inventory, the migration
rules, and the verification commands. Read it before a non-trivial change. This
file covers the contribution process itself.

## Licensing of contributions

This project is licensed under the **GNU Affero General Public License, version
3 only** (see `LICENSE`). By opening a pull request you agree that your
contribution is licensed under the same terms. There is no separate CLA.

Accelerate Legal is a modified version of
[Mike](https://github.com/Open-Legal-Products/mike); `NOTICE` records what came
from upstream. If your change is a general improvement rather than something
specific to this fork, consider sending it upstream as well — it will reach more
people there.

Do not add a dependency under a license incompatible with AGPL-3.0, and do not
paste code from another project into this one without checking its license and
recording it in `NOTICE`.

## Before you start

- For anything that touches multiple subsystems, the data model, or public
  API behavior, open a PRD issue first using the "New PRD" template
  (`docs/templates/PRD.md`). For small, well-understood fixes, a plain issue is
  enough.
- Prefer targeted edits over broad refactors. Keep each pull request to one
  bug, feature, or cleanup.
- Update the docs and `.env.example` files in the same change when you alter
  setup, configuration, or user-facing behavior.
- Keep self-hosting working. Changes must stay compatible with the supported
  Docker Compose, Supabase, S3-compatible storage, and Ollama paths. Explain any
  new local infrastructure or migration requirement in the same pull request.
- Never commit secrets, API keys, private or client documents, `.env` files,
  build output, or local test artifacts.

## Frontend and UI work

Read `docs/design-system.md` first. Before writing a new component, look for an
existing one, in this order: `frontend/src/app/components/ui/` for web
primitives, `frontend/src/shared/ui/` for anything the Word add-in also renders,
`frontend/src/app/components/shared/` for app-shell building blocks, then the
[shadcn/ui](https://ui.shadcn.com) registry — `frontend/components.json` is
configured for it, so `npx shadcn@latest add <component>` lands a component in
the right place with the right style.

Write a one-off in the feature directory only when the markup is genuinely
specific to that feature. Once the same markup appears in a second feature file,
promote it into `components/ui/` with a test and replace the copies.

Use the documented color, typography, spacing, and radius tokens rather than raw
hex values, and hold the accessibility baseline: a visible focus ring, an
accessible name on icon-only controls, `type="button"` on non-submit buttons, and
ARIA state alongside color. Update the matching loading state whenever you change
layout or spacing.

## Verification

**This repository ships no CI workflows, so nothing runs your tests but you.**
Run the checks for the area you changed before opening a pull request, and say
in the description which ones you ran and what they reported.

From the repository root:

```bash
npm test --prefix backend            # backend unit + route integration tests
npm run build --prefix backend

npm test --prefix frontend           # frontend component/hook tests
npm run test:coverage --prefix frontend   # enforces the coverage floors
npm run lint --prefix frontend
npm run build --prefix frontend

npm run typecheck --prefix word-addin
npm test --prefix desktop            # electron-free helper modules
npm run check --prefix desktop

npm run test:e2e                     # Playwright — see docs/e2e-testing.md
npm run test:stack --prefix backend  # needs a live local Supabase
```

The frontend coverage command enforces a ratchet floor on `src/app/lib/**`; a
new client-library function without tests will fail it. Floors only go up — when
you add tests, raise them in the same change.

New behavior should come with a test at the lowest layer that can catch the
regression: unit first, route-level integration second, and Playwright only when
a real browser flow is genuinely needed. Tests that need a live Supabase or a
model key are environment-gated and skip cleanly, so a plain `npm test` should
always be green.

Before you hand off, run `git diff --check`, read the diff for unrelated
changes, and remove them.

## Pull requests

Write the description in Markdown with four sections: summary, what changed,
why it changed, and testing performed. `.github/PULL_REQUEST_TEMPLATE.md` lays
this out.

## Security

Do not open a public issue for a security vulnerability. Follow `SECURITY.md`,
which uses GitHub's private vulnerability reporting.
