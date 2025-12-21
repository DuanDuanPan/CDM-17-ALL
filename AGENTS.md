# Repository Guidelines

## Project Structure & Modules
- `apps/web/` — Next.js frontend (App Router). UI in `components/`, state in `contexts/`, unit tests in `__tests__/`, Playwright E2E in `e2e/`.
- `apps/api/` — NestJS backend (HTTP + WebSockets). Source lives in `src/` (feature modules under `src/modules/`).
- `packages/` — shared workspaces:
  - `packages/database/` — Prisma schema/client + migrate/seed scripts
  - `packages/types/` — shared Zod schemas/types
  - `packages/ui/` — shared UI utilities + Tailwind styles
  - `packages/plugins/plugin-*/` — feature plugins
  - `packages/config/` — shared ESLint/Tailwind config
- `docs/` — project documentation/sprint artifacts; `_bmad/` — automation/workflow tooling.

## Build, Test, and Development Commands
This repo is a pnpm + Turborepo monorepo (Node `>=20`; Volta pins Node `22.x`).
- Install deps: `pnpm install`
- Run dev (all): `pnpm dev` (starts `apps/api` + `apps/web`)
- Run dev (single): `pnpm --filter @cdm/web dev`, `pnpm --filter @cdm/api dev:nest`
- Build all: `pnpm build`
- Lint all: `pnpm lint`
- Run unit tests: `pnpm test`

## Security & Configuration Tips
- Copy `.env.example` → `.env` and keep secrets out of git. `apps/api/.env` is a symlink to the root `.env`.
- Start local Postgres: `docker compose up -d postgres`
- Prisma workflows: `pnpm --filter @cdm/database db:migrate` (or `db:push`, `db:studio`, `db:seed`)

## Coding Style & Naming Conventions
- TypeScript-first; keep modules small and strongly typed.
- Use ESLint for linting/auto-fixes (no Prettier in this repo); run `pnpm lint` before opening a PR.
- Naming: React components use `PascalCase.tsx`; API tests are `*.spec.ts`; web tests are `*.test.ts(x)`; prefer barrels via `index.ts`.

## Testing Guidelines
- API: Jest in `apps/api/src/**/*.spec.ts` → `pnpm --filter @cdm/api test`
- Web: Vitest in `apps/web/__tests__` → `pnpm --filter @cdm/web test`
- E2E: Playwright in `apps/web/e2e` → `pnpm --filter @cdm/web test:e2e`

## Commit & Pull Request Guidelines
- Use Conventional Commits (seen in history): `feat(web): ...`, `fix(api): ...`, `docs: ...`, `chore: ...`.
- PRs should include: what/why, linked story/issue, screenshots for UI changes, and notes on tests run.
