# Release 0.1 verification

## Status

**Release 0.1 in progress.** ONK-001 provides the local Next.js/PostgreSQL foundation. ONK-002–004 remain planned; no live model calls or chat features have been implemented. The original documentation-only review is retained below as historical evidence.

## Evidence table

| Story | State | Focused checks | Browser / Compose / live model | Notes |
| --- | --- | --- | --- | --- |
| ONK-001 | Implemented | 13 Vitest tests, lint, typecheck, Prisma validation and build passed | Compose and browser passed; live model Not run | Foundation only; see detailed evidence below |
| ONK-002 | Planned | Not run | Not run | OpenRouter not integrated |
| ONK-003 | Planned | Not run | Not run | Chat UI and renderers not implemented |
| ONK-004 | Planned | Not run | Not run | Persistence, E2E and CI not implemented |

## Recording format

After each **approved** implementation, record the actual date, environment, files and acceptance criteria changed, exact commands and their observed results. Include lint/typecheck/unit/build/DB/browser checks as applicable. Clearly distinguish **mocked streaming tests** from **real billable OpenRouter calls**. Missing or failed checks must stay visible rather than being marked complete.

The user separately approves a commit. Only record a commit hash after the commit actually succeeds; do not imply that an approved change was pushed or released.

## Documentation baseline review — 2026-10-17

- `git diff HEAD` and `git diff --cached`: reviewed the documentation/configuration baseline; no application implementation is included.
- Read-only Python 3.14.4 audit (`python3` here-document): passed 46 relative documentation/asset links, balanced Markdown fences, parsing of both TOML files, four `Planned` stories with unchecked criteria, the documentation-only inventory and empty OpenRouter example credentials.
- `git -c core.whitespace=cr-at-eol diff HEAD --check`: passed after replacing two Markdown hard-break spaces with paragraph breaks.
- Application tests, build, browser, Compose and live OpenRouter checks: **Not run**; their implementation belongs to the planned stories above.

## ONK-001 implementation verification — 2026-10-17

Environment: Windows-mounted WSL checkout; Docker Engine 29.6.1 / Compose v5.3.0. The commands below used Node.js 24.20.0 / npm 11.19.0 in the Dockerfile's base environment (`open-nook-ai-onk001-base`), with the repository mounted at `/app`. The default shell had no Linux `node`; no system Node installation was changed.

### Focused commands

| Command | Observed result |
| --- | --- |
| `npm install --no-audit --no-fund` | Passed; created lockfile v3 |
| `npm install-scripts approve prisma @prisma/engines unrs-resolver` | Added version-pinned approvals only; subsequent Docker `npm ci` ran without pending-script warnings |
| `npm run test` | Passed: 13 tests in 2 files; database mocked, no provider calls |
| `npm run lint` | Passed with `--max-warnings=0` |
| `npm run db:generate` | Passed with a model-free Prisma schema |
| `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` | Generated the initial empty migration; no conversation schema |
| `npm run typecheck` | Passed Prisma/Next route generation and TypeScript checking |
| `npm run db:validate` | Passed |
| `npm run build` | Passed, including the final normal-server rebuild; prerendered `/`, dynamic `/api/health` |
| `npm run dev -- --port 33011` | Passed in a temporary Node container: placeholder and live PostgreSQL health reachable on container loopback; container stopped afterwards |
| `npm start -- --port 33012` | Final probe passed: placeholder, JavaScript assets, live database readiness and intended headers; startup log has no standalone-mode warning; temporary container stopped |
| `eslint next.config.mjs --max-warnings=0` | Passed after the startup configuration change |

### Compose and runtime observations

The isolated project was `open-nook-ai-onk001`, using `/tmp/open-nook-onk001.env` with newly generated test database credentials and host port `33010`. The existing application on port `3000` was left running. No user database or existing volume was deleted.

- `docker compose --env-file /tmp/open-nook-onk001.env -p open-nook-ai-onk001 config --quiet`: passed. Read-only parsed-config assertions confirmed exactly `web`/`db`, one named volume, web bound to `127.0.0.1`, no default DB host port, and only `DATABASE_URL` forwarded to web. The optional development override published DB only on localhost. Missing required configuration was rejected.
- `docker compose --env-file /tmp/open-nook-onk001.env -p open-nook-ai-onk001 build web`: passed, including clean `npm ci`, Prisma generation and production build. The final normal-server rebuild also passed.
- `docker compose --env-file /tmp/open-nook-onk001.env -p open-nook-ai-onk001 up -d --wait --wait-timeout 120`: passed; both containers healthy, web running as UID 1000.
- `curl --fail http://127.0.0.1:33010/api/health`: returned `200` with `{"status":"ok","database":"connected"}` and `Cache-Control: no-store`.
- `docker compose --env-file /tmp/open-nook-onk001.env -p open-nook-ai-onk001 exec -T web ./node_modules/.bin/prisma migrate status`: passed; one applied migration, database up to date.
- `python3 /tmp/open-nook-onk001-smoke.py`: passed. Stopping only the isolated DB produced a generic uncached `503` in 3.01 seconds; restarting DB restored `200` in the existing web process. Recreating both containers with `up -d --force-recreate --wait` retained the same migration record in the named volume. The only public-schema table was `_prisma_migrations`. Missing/invalid runtime URLs exited before migration/start without echoing credentials.
- Final image update with `up -d --no-deps --force-recreate --wait --wait-timeout 120 web`: passed. Readiness, page, static assets, `X-Powered-By` suppression, image secrets exclusion and missing/invalid URL rejection were rechecked successfully; all four browser cases passed again.

### Browser and secrets checks

- Chromium via Playwright 1.62.1 in a separate temporary tools directory: `node check.cjs` against the real Compose `web` service passed at 320/1280 px in light/dark themes. All four cases returned `200`, rendered the expected title/heading and theme, with no horizontal overflow, page errors or external page requests. Actual captures were inspected; screenshots remain under `/tmp/open-nook-onk001-browser/`, outside Git.
- A synthetic `.env.production` canary was present during Docker build-context capture, then removed. Image assertions found no `.env`, `.env.local`, `.env.production`, baked-in `DATABASE_URL`/`OPENROUTER_API_KEY`, client canary or production Vitest dependency. A separate scan of native-build client assets found no configured local database/provider secrets; values were not printed.
- Git ignore checks passed for local `.env*`, generated Prisma Client and Next.js artifacts; `.env.example` remains trackable. Source SPDX, exact dependency versions and 60 relative documentation/asset links passed read-only audits.

### Findings and proof boundaries

- The first `npm start` probe served the page/assets/health but warned that `next start` should not be combined with `output: standalone`. The configuration and Docker entrypoint were simplified to the normal Next.js server. Both builds, the updated Compose service, assets/browser checks and clean `npm start` log passed after the fix.
- npm emits an ESLint 9.39.5 deprecation warning. That major is pinned because the current Next.js React/accessibility plugins declare ESLint 9 peer support. Lint itself passed; no forced or legacy peer-dependency installation was used.
- The Docker socket and host registry access initially required sandbox escalation; permitted Docker checks succeeded. These permission errors were environment boundaries, not failed application checks.
- Native commands were exercised inside Node 24.20.0 containers; a Windows-host Node/browser session was **Not run**. OpenRouter, assistant-ui, conversation CRUD, CI and billable provider checks are **Not run / out of scope** for ONK-001.
- Final commit review: `git -c core.whitespace=cr-at-eol diff --cached --check` flagged only the Prisma-generated empty migration's trailing blank line. Other staged files passed unchanged whitespace checks. The generated SQL passed with only `blank-at-eof` disabled, and its SHA-256 matched the live migration ledger; its original bytes were preserved. Package/lock consistency, 60 local links, source notices and staged secret checks passed.
- The user separately approved the ONK-001 implementation commit after review on 2026-10-17. No push was requested.
