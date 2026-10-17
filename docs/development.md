# Local development — ONK-001 foundation

The current app provides a responsive placeholder and `GET /api/health`. Chat, OpenRouter calls and conversation storage are not implemented yet.

## Tested foundation versions

| Component | Pinned version |
| --- | --- |
| Node.js / npm | 24.20.0 / 11.19.0 |
| Next.js | 16.4.2 |
| React / React DOM | 19.3.1 |
| TypeScript | 5.9.3 |
| Prisma CLI / Client / PostgreSQL adapter | 7.10.1 |
| PostgreSQL Docker image | 18.6-bookworm |
| Zod / Vitest | 4.6.7 / 5.0.5 |

The lockfile pins transitive dependencies. Install with `npm ci`. The assistant-ui / AI SDK integration will be selected and tested in the later stories; those packages are not installed by ONK-001.

Node's exact version is enforced by `.npmrc`. npm install-script approvals in `package.json` are pinned to the installed Prisma/engine and native resolver versions; no blanket script approval is enabled. ESLint 9.39.5 matches the current Next.js React/accessibility plugin peer ranges, although npm marks that ESLint major as deprecated.

## Docker Compose

```bash
cp .env.example .env
# Replace POSTGRES_PASSWORD and the matching password in DATABASE_URL.
docker compose up --build --wait
```

Open `http://localhost:3000`. If another app uses that port, set `APP_PORT` in `.env` or run `APP_PORT=3100 docker compose up --build --wait`.

Only `web` and `db` run. The web port binds to `127.0.0.1`; the database has no published port in the base configuration. Its named volume mounts at `/var/lib/postgresql`, the PostgreSQL 18 image's persistent parent directory.

The web entrypoint validates `DATABASE_URL`, applies committed migrations with `prisma migrate deploy`, then starts the non-root Next.js process. The initial migration establishes Prisma's migration history without application tables. Conversation models and CRUD belong to ONK-004.

```bash
docker compose ps
curl --fail http://127.0.0.1:3000/api/health
docker compose exec web ./node_modules/.bin/prisma migrate status
docker compose down
```

The health endpoint runs `SELECT 1` through Prisma. It returns `200` with `{"status":"ok","database":"connected"}` only if PostgreSQL is reachable; configuration or database failures return a generic `503`. Responses use `Cache-Control: no-store`. Connection and query timeouts are bounded to three seconds each. Both Compose services have health checks, and web startup waits for the database.

`docker compose down` preserves the named database volume. Do not add `--volumes` unless you explicitly intend to delete local data. Changing database credentials after initialization also requires updating the existing PostgreSQL role; editing `.env` alone does not change a stored role password.

## Native Next.js with a Compose database

```bash
nvm install
nvm use
npm ci
cp .env.example .env
# Replace the password in both database settings.
docker compose -f compose.yaml -f compose.dev.yaml up -d --wait db
# Now change only DATABASE_URL in .env to use 127.0.0.1:5433 instead of db:5432.
npm run db:migrate
npm run dev
```

The optional `compose.dev.yaml` publishes PostgreSQL only on `127.0.0.1:${DB_PORT:-5433}`. Match that port in the native `DATABASE_URL`. Native development and `npm start` bind Next.js to `127.0.0.1`; inside Compose the web process listens on its container interface while the host mapping remains local.

The Compose URL uses `db:5432`; the native URL uses `127.0.0.1:5433`. Switch the URL back before starting the full Compose stack. Percent-encode special characters in URL credentials. OpenRouter settings may remain empty throughout ONK-001.

## Focused checks

```bash
npm run test
npm run lint
npm run typecheck
npm run db:validate
npm run build
npm start
```

Tests mock the database for health success/error cases and check environment validation without exposing credentials. They do not prove a live database connection; see the release [verification](releases/release-0.1-mvp/verification.md) for actual Compose outcomes. Building, generating Prisma Client and type checking do not require a live database or an OpenRouter key. Runtime startup requires a complete PostgreSQL connection URL.

Local `.env*` files are ignored by Git and excluded from Docker builds, except the non-secret `.env.example`. The Docker image receives database settings only at runtime. The provider and rich-rendering stories have separate approval and test boundaries.

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Prisma Client v7](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction), [Prisma generation without models](https://www.prisma.io/docs/cli/v7/generate), [PostgreSQL container persistence](https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/).
