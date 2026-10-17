# Release 0.1 verification

## Status

**Release 0.1 in progress.** ONK-001 provides the local Next.js/PostgreSQL foundation; ONK-002 adds the server-only model registry and streaming API. ONK-003/004 remain planned. Provider verification uses mocks; live connectivity has not been tested. The original documentation-only review is retained below as historical evidence.

## Evidence table

| Story | State | Focused checks | Browser / Compose / live model | Notes |
| --- | --- | --- | --- | --- |
| ONK-001 | Implemented | 13 Vitest tests, lint, typecheck, Prisma validation and build passed | Compose and browser passed; live model Not run | Foundation only; see detailed evidence below |
| ONK-002 | Implemented | 66 new tests / 79 total, lint, typecheck and production builds passed | Compose + real HTTP with mocked provider passed; live model Not run | No chat UI or persistence yet; see evidence below |
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

## ONK-002 implementation verification — 2026-10-17

Environment: same Windows-mounted WSL checkout, Docker Engine 29.6.1 / Compose v5.3.0, Node.js 24.20.0 / npm 11.19.0. Implementation was explicitly approved by the user; the implementation checks below preceded separate commit approval. No push was requested.

### Scope and commands

Added `src/server/ai/{config,request,lifecycle,provider,stream}.ts`, `GET /api/models`, `POST /api/chat`, server-side Compose settings and deterministic test fixtures. The text-only UI-message request replaces the earlier conceptual `message`/`conversationId` shape; transport IDs are validated but never persisted. The current contract and limits are in [HTTP contracts](../../api-contract.md) and [Model configuration](../../model-configuration.md). No UI, renderer, database schema or CI work was added.

Commands beginning with `npm` below ran inside `open-nook-ai-onk001-base` using `docker run --rm --user "$(id -u):$(id -g)" --mount type=bind,src="$PWD",dst=/app --workdir /app --env npm_config_cache=/tmp/npm-cache --env CHECKPOINT_DISABLE=1 open-nook-ai-onk001-base <command>`. No host Node installation was changed.

| Command | Observed result |
| --- | --- |
| `npm install --save-exact --no-audit --no-fund ai@7.0.143 @openrouter/ai-sdk-provider@3.1.0` | Passed; exact direct dependencies and lockfile updated, no forced peer overrides |
| `npm run test -- tests/ai-config.test.ts tests/chat.test.ts` | Initial failures exposed empty-message refinement, a provider-generated text ID, asynchronous response cancellation and an unhandled aborted decoder branch. Fixes passed all 61 tests without unhandled errors; further cases were then added |
| `npm run test` | Final pass: **79 tests in 4 files**: 20 configuration/models, 46 chat/SDK and 13 foundation regressions; no live network |
| `npm run lint` | Passed with zero warnings, including a rerun after the final stream-completion fix |
| `npm run typecheck` | Passed after replacing the configuration parser's `NodeJS.ProcessEnv` parameter type (Next.js adds a required `NODE_ENV`) with a readonly environment dictionary |
| `npm run build` | Passed, including the final rebuild: static placeholder and dynamic `/api/health`, `/api/models`, `/api/chat`; integrated TypeScript checking passed |
| `docker compose --env-file /tmp/open-nook-onk002.env -p open-nook-ai-onk002 config --quiet` | Passed; parsed-config assertions confirmed only web/db, local web port, no published DB port, one persistent volume and only the intended server settings |
| `docker compose --env-file /tmp/open-nook-onk002.env -p open-nook-ai-onk002 build web` | Passed, including clean `npm ci` and the final rebuild after completion handling changed |

The actual installed SDK and OpenRouter adapter are exercised together; only global fetch is replaced. Tests cover trimmed/deduplicated five-slot configuration, disabled/invalid setup, strict bounded requests, context conversion, denied models, malformed JSON/UTF-8, misleading payload length, provider HTTP/network/SSE failures, missing completion, unexpected tool completion, partial-body failure, redirects, output limits, timeout before headers and during streaming, cancelled uploads/clients/readers and timer cleanup. All provider settings are cleared by test setup; unmocked global fetch throws. No API key is needed by tests or build.

### Production HTTP and Compose evidence

The isolated project is `open-nook-ai-onk002`, using generated database credentials in `/tmp/open-nook-onk002.env` and web port **33020**. The existing ONK-001 stack and unrelated applications were preserved. Test-only files remained in `/tmp/open-nook-onk002-check`, outside Git and the production image.

- `docker compose --env-file /tmp/open-nook-onk002.env -p open-nook-ai-onk002 -f compose.yaml -f /tmp/open-nook-onk002-check/compose.mock.yaml up -d --wait --wait-timeout 120`: passed; web/db healthy. A temporary Node preload intercepted the fixed OpenRouter endpoint and denied other external fetches, using a clearly synthetic key and model IDs. It returned realistic provider SSE to the production SDK, rather than replacing the application Route Handlers.
- `python3 /tmp/open-nook-onk002-check/smoke.py`: passed against real HTTP. Verified healthy PostgreSQL, two deduplicated models, unknown/malformed/oversized requests with no provider access, protocol headers and text stream, safe provider 401, partial-stream timeout, output-byte limit, incomplete completion and client disconnection. Exactly **6 mocked upstream calls**, one per accepted request, **0 real provider calls**; HTTP disconnect aborted the upstream signal in **3 ms**. Provider key/headers/generation ID were absent from public output. No invalid request triggered a provider attempt.
- `docker compose --env-file /tmp/open-nook-onk002.env -p open-nook-ai-onk002 up -d --no-deps --force-recreate --wait --wait-timeout 120 web`: passed; removed the temporary preload/volume and synthetic provider configuration. Read-only Docker inspection and HTTP assertions confirmed healthy non-root web, connected DB, `/` returning `200`, uncached disabled `/api/models`, `POST /api/chat` returning `503 ai_not_configured`, no test mount/`NODE_OPTIONS`, and clean logs. The earlier ONK-001 web remained healthy.

### Security, review and limits

- A network-disabled `docker run --rm --network none --entrypoint node open-nook-ai-onk002-web --input-type=module -e ...` assertion passed: no `.env*` files, baked provider/database variables, test fixture directory or Vitest dependency in the production image.
- `python3 /tmp/open-nook-onk002-check/audit.py`: passed **67 local documentation/asset links**, Markdown fences, handwritten source notices, exact package/lock versions, candidate-file secret checks and **9 client JavaScript files** with no private settings or provider endpoint. The audit initially treated a public `.env.example` placeholder as a secret; it was corrected to exclude public example values and include the generated test credentials and synthetic runtime key. No private values were printed.
- Default SDK error logging is overridden; public events contain text and safe lifecycle fields only. Raw provider errors, reasoning, source/tool/file payloads and metadata are omitted. SDK/provider retries and fallback are disabled. Provider response bytes, forwarded output, context, upload and total duration are bounded. Unknown or tool-call completion does not become a successful finish.
- Live OpenRouter connectivity, real model compatibility and charged generation: **Not run**, no separate approval requested. Mocks do not prove cloud connectivity or provider-side cancellation/billing behavior.
- Browser chat/assistant-ui behavior: **Not run**, ONK-003 is still planned. UI source did not change; the ONK-001 placeholder browser evidence remains historical. Conversation persistence and functional CI remain ONK-004.

- Final `git diff HEAD --check` passed. At implementation closeout, the staged diff was empty; all new and modified source/config/test files were reviewed, including untracked files. No local environment file, generated migration change, secret, runtime preload or unrelated work is included. The user separately approved the ONK-002 commit on 2026-10-17 after the successful checks and review; no push was requested.
