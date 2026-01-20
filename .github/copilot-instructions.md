## Purpose
This file gives concise, project-specific guidance for an AI coding agent to be productive in this repository.

## Big picture
- Next.js (app dir) React app at `/app` (Next 16). UI components live in `/components` with primitives under `/components/ui`.
- Server utilities and DB code live in `/lib` (see `lib/db.ts` for DB access pattern).
- Postgres is the primary datastore; SQL migration/seed files live in `/scripts`.
- Containerized deployment uses `Dockerfile` + `docker-compose.yml` with Traefik for routing and TLS.

## Quick commands
- Local dev (no DB): `npm run dev` (see [package.json](../package.json)).
- Lint: `npm run lint` ([package.json](../package.json)).
- Build (local): `npm run build` then `npm run start` for production.
- Docker image build (example):
  - `docker build --build-arg DATABASE_URL="postgres://beta:beta@db:5432/beta" --build-arg DATABASE_SSL=false -t beta-app:latest .`
  - `docker-compose up --build` uses `docker-compose.yml` to start `db`, `app`, and `traefik`.

## Important environment variables
- `DATABASE_URL` — required by `lib/db.ts`; code throws if missing (see [lib/db.ts](../lib/db.ts)).
- `DATABASE_SSL` — set to `true`/`false`; used by DB pool and passed at build time in `Dockerfile`.
- `PORT`, `HOSTNAME` — app runtime settings (Dockerfile and `docker-compose.yml`).
- `APP_HOST` — used in Traefik labels in `docker-compose.yml` to set host routing.
- See `env.example` for a minimal example ([env.example](../env.example)).

## DB / migrations
- DB schema and seeds are under `/scripts` (e.g. `001_create_tables.sql`, `003_seed_components.sql`).
- `docker-compose.yml` runs Postgres 16; use `docker-compose up db` + `psql` or the app container to run migrations/seeds.

## Key implementation patterns
- Server-side DB access: `lib/db.ts` exports a `pool` and `query()` helper — always expect `DATABASE_URL` in env.
- Next build-time data: Dockerfile passes `DATABASE_URL`/`DATABASE_SSL` as build-args because some routes may be statically generated at build time.
- UI organization: reusable primitives in `/components/ui/*`; page-level code is in `/app` and `/app/*/page.tsx`.
- SQL and DB changes: prefer adding SQL files to `/scripts` rather than editing the DB directly.

## Integrations & infra
- Traefik: `docker-compose.yml` configures a Traefik container and looks for `./traefik/dynamic.yaml` and `./certs`.
- Postgres: service `db` in `docker-compose.yml` with healthcheck (`pg_isready`).
- Docker image lifecycle: multi-stage Dockerfile (deps, builder, prod-deps, runner); builds dev deps for the build stage (Tailwind/PostCSS need dev deps).

## Project-specific gotchas to watch for
- The repo includes a `pnpm-lock.yaml` but the `Dockerfile` expects `package-lock.json`/npm — builds fallback to `npm install` if no `package-lock.json` exists. Confirm the intended package manager before changing CI/builds.
- `lib/db.ts` will throw at runtime if `DATABASE_URL` is not set — set envs for build or runtime accordingly.
- Build tooling (Tailwind/PostCSS) is required at build time; Dockerfile intentionally installs dev dependencies in `deps` stage.

## Where to look for further context
- App entry & routes: `/app` and `/app/layout.tsx`.
- Components & UI: `/components`, `/components/ui`.
- DB code & helpers: `/lib` (notable: [lib/db.ts](../lib/db.ts), [lib/actions.ts](../lib/actions.ts)).
- Container config: `Dockerfile`, `docker-compose.yml`.
- SQL scripts: `/scripts`.

## When you need clarification
- Ask the maintainers about: preferred package manager (`npm` vs `pnpm`), CI/deploy steps (no `.github/workflows` detected), and whether build-time DB access is expected for all environments.

If you want, I can update this with CI/CD steps or add examples for local DB seeding and a minimal dev-compose override.
