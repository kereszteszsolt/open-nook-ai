# Local development — Release 0.1

The app provides a responsive assistant-ui chat with safe rich previews, database readiness, `GET /api/models` and a server-only `POST /api/chat` stream. Conversation CRUD and ordered history persist through PostgreSQL. Provider checks use mocks; live OpenRouter connectivity has not been tested.

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
| AI SDK / OpenRouter adapter | 7.0.143 / 3.1.0 |
| assistant-ui React / AI SDK adapter / AI SDK React | 0.15.29 / 0.0.13 / 4.0.147 |
| React Markdown / KaTeX / Mermaid | 10.1.0 / 0.19.0 / 12.2.0 |
| Vega / Vega-Lite / interpreter | 6.4.0 / 6.5.0 / 2.3.2 |
| DOMPurify / Prism | 3.4.17 / 1.30.0 |
| Playwright / jsdom | 1.62.1 / 30.1.3 |

The lockfile pins transitive dependencies. Install with `npm ci`. The text-only AI SDK 7 UI-message API contract is documented in [HTTP contracts](api-contract.md); supported renderer syntax and limits are in [Rich rendering](rendering.md).

Node's exact version is enforced by `.npmrc`. npm install-script approvals in `package.json` are pinned to the installed Prisma/engine and native resolver versions; no blanket script approval is enabled. ESLint 9.39.5 matches the current Next.js React/accessibility plugin peer ranges, although npm marks that ESLint major as deprecated.

## Docker Compose

```bash
cp .env.example .env
# Replace POSTGRES_PASSWORD and the matching password in DATABASE_URL.
docker compose up --build --wait
```

Open `http://localhost:33040`. If another app uses that port, set `APP_PORT` in `.env` or run `APP_PORT=33042 docker compose up --build --wait`.

Only `web` and `db` run. The web port binds to `127.0.0.1`; the database has no published port in the base configuration. Its named volume mounts at `/var/lib/postgresql`, the PostgreSQL 18 image's persistent parent directory.

The Compose project is `open-nook-ai`, matching the GitHub repository. Both services use `restart: "no"` and start only when requested. Published host ports are reserved for this repository: 33040 for web and 33041 for the optional development database. Keep overrides above 33000, unique across repositories and bound to loopback.

The web entrypoint validates `DATABASE_URL`, applies committed migrations with `prisma migrate deploy`, then starts the non-root Next.js process. The initial migration establishes Prisma's migration history without application tables. The additive history migration creates Conversation/Message tables, enums, unique order/ID constraints and cascading deletes.

```bash
docker compose ps
curl --fail http://127.0.0.1:33040/api/health
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
# Now change only DATABASE_URL in .env to use 127.0.0.1:33041 instead of db:5432.
npm run db:migrate
npm run dev
```

The optional `compose.dev.yaml` publishes PostgreSQL only on `127.0.0.1:${DB_PORT:-33041}`. Match that port in the native `DATABASE_URL`. Native development and `npm start` bind Next.js to `127.0.0.1`; inside Compose the web process listens on its container interface while the host mapping remains local.

The Compose URL uses `db:5432`; the native URL uses `127.0.0.1:33041`. Switch the URL back before starting the full Compose stack. Percent-encode special characters in URL credentials. OpenRouter settings may remain empty; models/chat then report a disabled setup state. Set a key and one or more of the five model slots only when you intend to make billable calls. Compose forwards these server settings at runtime; see [model configuration](model-configuration.md).

## Focused checks

```bash
npm run test
npm run lint
npm run typecheck
npm run db:validate
npm run build
npm start
```

Tests mock the database for health success/error cases, validate environment settings and exercise the actual AI SDK/OpenRouter adapter with explicitly mocked fetch. Test setup clears all provider environment slots and blocks unmocked global fetch; no secret or live provider call is needed. `npm run test:db` separately exercises a real isolated PostgreSQL database; unit tests alone do not prove its connectivity; see the release [verification](releases/release-0.1-mvp/verification.md) for actual Compose outcomes. Building, generating Prisma Client and type checking do not require a live database or an OpenRouter key. Runtime startup requires a complete PostgreSQL connection URL.

Local `.env*` files are ignored by Git and excluded from Docker builds, except the non-secret `.env.example`. The Docker image receives database/provider settings only at runtime. Provider retries and fallbacks are disabled; timeout, cancellation and bounded text streaming are tested. Renderer tests cover normal and hostile content; UI fixture tests intercept model/chat/history requests; persisted-history tests use the guarded mock provider with real Route Handlers and PostgreSQL.

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Prisma Client v7](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction), [Prisma generation without models](https://www.prisma.io/docs/cli/v7/generate), [PostgreSQL container persistence](https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/).
