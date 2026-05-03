# dr-travel Playwright suite

Visual + behavioral regression tests for the theme system.

## What is covered

- `theme-persistence.spec.ts` — toggling `ThemeSwitch` flips `data-theme`
  on `<html>` and the preference survives a full page reload.
- `visual.spec.ts` — full-page screenshots of `/`, `/trips`, and
  `/admin/dashboard` in both `light` and `dark` modes. Snapshots live in
  `tests/visual.spec.ts-snapshots/`. CI fails when a diff exceeds
  `maxDiffPixelRatio` (configured in `playwright.config.ts`).
- `global.setup.ts` — logs in via `POST /api/admin/login` using
  `ADMIN_USERNAME` / `ADMIN_PASSWORD` (default `admin` / `drtravel2024`)
  and saves the resulting token + dark theme to
  `tests/.auth/admin.json`. The setup fails fast with an actionable
  message if the API is unreachable or the admin isn't seeded — the
  admin visual specs strictly require an authenticated dashboard and
  will not silently fall back to the login screen.

## Running locally

The Playwright config auto-starts both servers (`@workspace/api-server`
on `:3001` and `@workspace/dr-travel` on `:5000`) before the run and
reuses any already-running instance.

```bash
pnpm --filter @workspace/dr-travel test:e2e            # run suite
pnpm --filter @workspace/dr-travel test:e2e:update     # refresh snapshots
pnpm --filter @workspace/dr-travel test:e2e:ui         # Playwright UI mode
```

The first run on a new machine needs browsers installed:

```bash
pnpm --filter @workspace/dr-travel exec playwright install chromium
```

## CI

`.github/workflows/visual-tests.yml` runs the suite on every push and
PR. It installs Chromium with `--with-deps`, pushes the DB schema, runs
`@workspace/scripts setup-admin` to seed the admin user, then executes
`pnpm --filter @workspace/dr-travel run test:e2e`. Any
contrast/visual regression makes the test command exit non-zero and
fails the build. Snapshots are committed; intentional UI changes
require a follow-up commit produced by `test:e2e:update`.

### Required CI secrets / env

- `DATABASE_URL` — **isolated** test database. Don't point this at any
  shared/production database; the workflow seeds an `admin` /
  `drtravel2024` account into whatever database it gets.
- `JWT_SECRET` — required by the API server's `/api/admin/login`. The
  workflow falls back to a fixed throwaway value if the secret is not
  configured, which is safe only because the database is also
  throwaway.
- `SESSION_SECRET` — same handling as `JWT_SECRET`.
