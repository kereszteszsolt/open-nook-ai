# Release 0.1 verification

## Status

**Release 0.1 in progress.** ONK-001 provides the local Next.js/PostgreSQL foundation; ONK-002 adds the server-only model registry and streaming API. ONK-003 adds assistant-ui chat and safe rich previews; ONK-004 remains planned. Provider verification uses mocks; live connectivity has not been tested. The original documentation-only review is retained below as historical evidence.

## Evidence table

| Story | State | Focused checks | Browser / Compose / live model | Notes |
| --- | --- | --- | --- | --- |
| ONK-001 | Implemented | 13 Vitest tests, lint, typecheck, Prisma validation and build passed | Compose and browser passed; live model Not run | Foundation only; see detailed evidence below |
| ONK-002 | Implemented | 66 new tests / 79 total, lint, typecheck and production builds passed | Compose + real HTTP with mocked provider passed; live model Not run | No chat UI or persistence yet; see evidence below |
| ONK-003 | Implemented | 55 new tests / 134 total, lint, typecheck and production builds | 12 browser cases; Compose and real HTTP with mocked upstream; live model Not run | In-memory chat only; see detailed evidence below |
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

## ONK-003 implementation verification — 2026-10-17

Environment: Windows-mounted WSL checkout, Docker Engine 29.6.1 / Compose v5.3.0, Node.js 24.20.0 / npm 11.19.0. The user explicitly approved ONK-003 implementation and, after verification and review, separately approved its commit on 2026-10-17. The next story still requires approval; no push was requested. No billable provider request was authorized or run.

### Scope and dependency compatibility

Replaced the placeholder with a responsive assistant-ui chat. Added `src/components/chat` for model loading, the runtime and bounded client transport; `src/components/rendering` for safe Markdown/GFM, inert Prism tokens, KaTeX, constrained Mermaid/Vega-Lite, SVG sanitation and exact clipboard copying. The existing server API, Prisma schema and migration bytes are unchanged. History remains in memory; reload resets the chat. No auth, tools/MCP connection, cloud history, CRUD or CI workflow was added.

The official runtime documentation and installed package manifests were checked against AI SDK 7.0.143 / React 19.3.1. `@ai-sdk/react@4.0.147` depends on exactly AI SDK 7.0.143; assistant-ui React 0.15.29 and `@assistant-ui/ai-sdk@0.0.13` accept these versions. The older `@assistant-ui/react-ai-sdk` package is a compatibility re-export, so the current package is used directly. `useAISDKRuntime` wraps the regular AI SDK `useChat` / `DefaultChatTransport`; no frontend tool/system forwarding or assistant-cloud configuration is enabled. Transitive SDK packages do not authorize any tool or external connection.

Actual dependency commands ran in the established `open-nook-ai-onk001-base` container with repository mount `/app`, UID/GID of the checkout owner, `npm_config_cache=/tmp/npm-cache` and `CHECKPOINT_DISABLE=1`:

```bash
npm install --save-exact --no-audit --no-fund @assistant-ui/react@0.15.29 @assistant-ui/ai-sdk@0.0.13 @ai-sdk/react@4.0.147 react-markdown@10.1.0 remark-gfm@4.0.1 remark-math@6.0.0 katex@0.19.0 mermaid@12.2.0 dompurify@3.4.17 vega@6.4.0 vega-lite@6.5.0 vega-interpreter@2.3.2 prismjs@1.30.0
npm install --save-dev --save-exact --no-audit --no-fund @types/prismjs@1.26.6 @types/katex@0.16.8 @testing-library/react@16.3.3 @testing-library/user-event@14.6.8 @testing-library/jest-dom@7.0.1 jsdom@30.1.3 @playwright/test@1.62.1
npm uninstall --save-dev --no-audit --no-fund @testing-library/user-event @testing-library/jest-dom
```

All passed without peer overrides. The two unused testing packages were removed before final build; React Testing Library's actual renderer tests use fireEvent and Vitest assertions. Dependency versions are exact in package/lock files. npm continues to emit the previously documented ESLint 9 deprecation notice.

### Focused checks and findings

| Command | Observed result |
| --- | --- |
| `npm run test -- tests/render-policy.test.ts tests/renderers.test.tsx tests/chat-transport.test.ts` | Passed: initial 54 new tests, including normal/hostile text, math, graphics, clipboard and client context |
| `npm run test` | Passed: initial complete run, 133 tests in 7 files, including all 79 ONK-001/002 regressions; final results after SVG hardening are recorded below |
| `npm run test -- tests/renderers.test.tsx` | Passed: 17 tests after adding CSS-escape resource rejection |
| `npm run typecheck` | Initial run caught Vega logger return types and missing loader methods; corrected to the installed interfaces, then passed |
| `npm run lint` | Initial run caught ref/memoization and JSX-in-try/catch patterns; corrected without disabling rules. Subsequent lint passed with zero warnings |
| `npm run build` | Passed: production compile, TypeScript, prerendered chat route and existing dynamic APIs; no provider key or live DB needed for build |
| `docker compose --env-file /tmp/open-nook-onk003.env -p open-nook-ai-onk003 build web` | Clean dependency install and production build passed; final source/image checks recorded below |
| `docker compose --env-file /tmp/open-nook-onk003.env -p open-nook-ai-onk003 up -d --wait --wait-timeout 120` | Passed: isolated web/db healthy on localhost port 33030, generated DB credentials, blank provider key |

The React transport now depends on the selected model directly; installed `useChat` resolves the latest transport without resetting messages. Client validation does not truncate context. Stop uses the runtime's cancellation action and preserves a visibly incomplete assistant turn. Explicit Regenerate replaces the answer using the same user prompt; no automatic provider/model retry is configured. A renderer exception falls back to readable text.

### Browser checks

Chromium **151.0.7922.34** via Playwright **1.62.1** ran in a separate `open-nook-ai-browser-tools` container. Its Chromium system dependencies were installed in that tools image; the existing cached browser was reused. No browser/tool package was added to the production runtime.

Actual command:

```bash
docker run --rm --user "$(id -u):$(id -g)" --network host --mount type=bind,src="$PWD",dst=/app --mount type=bind,src=/home/zsolti-wsl/.cache/ms-playwright,dst=/ms-playwright,readonly --workdir /app --env PLAYWRIGHT_BROWSERS_PATH=/ms-playwright --env E2E_BASE_URL=http://127.0.0.1:33030 open-nook-ai-browser-tools npm run test:browser
```

- First run: 10 passed, 2 failed because the error locator also matched Next.js's route-announcer alert. The test selector was narrowed to the chat error; no product error was hidden.
- Rerun: **12 passed**, six scenarios each at desktop 1280×900/light and mobile 360×800/dark. Checked model choice in the outgoing request, keyboard Send/Shift+Enter, actual Markdown/table/code/math/Mermaid/Vega rendering, exact code/message clipboard text, no duplicate turns after Regenerate, New chat, retained failed/stopped prompts, disabled setup, registry recovery and no automatic retry.
- Hostile fixtures covered raw scripts/images/unsafe links, KaTeX external resources, Mermaid config/click injection, genuinely malformed Mermaid syntax and chart URL loading. Previews failed safely with source/other text preserved. Both normal and hostile cases reported zero page errors and zero external requests. Screenshots from real rendering were inspected; captures/traces are under ignored `test-results/`, not committed promotional assets.
- Browser tests intercept every chat endpoint before navigation; the Stop case uses a controllable mock fetch stream. Actual Next.js/API/upstream cancellation is separately checked below with a server-side provider mock.

See [Rich rendering](../../rendering.md) for supported syntax, limits and implementation references. Live OpenRouter connectivity/compatibility and billable generation: **Not run**. A Windows-host browser session and complete persisted-history flows: **Not run**; history and CI remain ONK-004.

### Final source and full API smoke

- Final `npm run test`: **134 passed in 7 files** (32 policy, 17 renderer/component, 6 client transport, 79 prior API/foundation tests). The last renderer case denies CSS escapes that could conceal external SVG resource functions. Final lint passed; production rebuilds include TypeScript checking.
- The final Docker rebuild includes the complete rich UI, mobile chart scrolling with readable labels and keyboard-focusable graphics. Dependency cleanup removed the unused test helpers; a comparison with the previous lockfile found no existing package version upgrades.
- `docker compose --env-file /tmp/open-nook-onk003.env -p open-nook-ai-onk003 -f compose.yaml -f /tmp/open-nook-onk003-check/compose.mock.yaml up -d --no-deps --force-recreate --wait --wait-timeout 120 web`: passed using the final UI build. A temporary Node preload intercepted only the fixed provider endpoint, denied other external fetches, and supplied realistic OpenRouter SSE. The key/model IDs were synthetic. No Route Handler or browser API response was replaced in this smoke.
- `docker run --rm --user "$(id -u):$(id -g)" --network host --mount type=bind,src="$PWD",dst=/app --mount type=bind,src=/home/zsolti-wsl/.cache/ms-playwright,dst=/ms-playwright,readonly --mount type=bind,src=/tmp/open-nook-onk003-check,dst=/checks --workdir /app --env PLAYWRIGHT_BROWSERS_PATH=/ms-playwright open-nook-ai-browser-tools node /checks/full-stack.mjs`: passed. Real browser → Next.js → SDK → mocked OpenRouter streamed rich text, local math/code/Mermaid/chart assets, selected the expected model, aborted upstream on Stop and regenerated without duplicate user/assistant turns. Exactly **3 mocked provider calls**, zero real provider calls, zero page errors and zero external browser requests. Actual capture is in `/tmp/open-nook-onk003-check/full-stack.png`.
- The first production-image audit found `@playwright/test` retained as Next.js's optional peer even after `npm prune --omit=dev`; Vitest and jsdom were already absent. Docker now explicitly removes the three Playwright tooling packages in the production-dependencies stage before copying runtime modules. The corrected image audit and restored-runtime checks follow below.

- A stricter final browser assertion found Mermaid labels missing even though SVG geometry was visible. Mermaid 12 prioritizes root `htmlLabels` over the deprecated diagram-specific option; setting root `htmlLabels: false` keeps real SVG text instead of HTML foreign objects removed by sanitation. The label assertions remain in both viewport tests and the full API smoke. Final rerun results follow below.

- After the root-level Mermaid fix, the full real-HTTP smoke passed again with label assertions, 3 mocked upstream calls, no duplicates, successful Stop abort and zero external requests/page errors. The final targeted browser suite then passed **all 12 cases**, including both Mermaid label checks. Final production build and lint passed; no additional application source changes followed.
- `docker run --rm --network none --entrypoint node --mount type=bind,src=/tmp/open-nook-onk003-check/image-audit.mjs,dst=/image-audit.mjs,readonly --mount type=bind,src=/tmp/open-nook-onk003.env,dst=/checks-env,readonly --mount type=bind,src="$PWD/.env",dst=/local-env,readonly open-nook-ai-onk003-web /image-audit.mjs`: passed after the packaging fix and final rebuild. The image has no `.env*` files, baked DB/provider settings, Vitest, Playwright or jsdom. **103 client JavaScript files** contain no local/test secrets or OpenRouter provider endpoint. Secret values were never printed.
- Final `docker compose --env-file /tmp/open-nook-onk003.env -p open-nook-ai-onk003 up -d --no-deps --force-recreate --wait --wait-timeout 120 web`: passed. Read-only Docker/HTTP checks confirmed a healthy non-root runtime, connected DB, disabled model API with a blank key and no `/checks` mount or `NODE_OPTIONS`. The prior ONK-001/002 stacks remained healthy. The runtime remains available on **http://127.0.0.1:33030** with generation disabled until configured.
- A focused Chromium visual check (`node /checks/visual.mjs` in the same tools container) passed for the actual disabled setup at **320 px/dark**, without horizontal overflow. It also captured and inspected the corrected Mermaid SVG text/labels without foreign objects. No page errors or external requests. Captures remain in `/tmp/open-nook-onk003-check/`.
- `python3 /tmp/open-nook-onk003-check/audit.py`: passed local links/fences, source notices, exact package/lock consistency and candidate-file/client secret scans. Git ignore checks confirmed `.env`, `.next`, generated Prisma Client and browser artifacts stay outside the commit. `git diff HEAD --check` and new-file whitespace checks passed. All changes were reviewed, including untracked implementation/tests; the staged diff was empty at implementation closeout. Commit approval was subsequently provided separately by the user on 2026-10-17.
