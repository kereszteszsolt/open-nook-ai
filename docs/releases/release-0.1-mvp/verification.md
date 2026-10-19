# Release 0.1 verification

## Status

**Release 0.1 implemented for local use.** ONK-001–004 provide the Next.js/PostgreSQL stack, server-only model registry/streaming, assistant-ui and safe rich rendering, saved conversation history and a CI workflow. Local checks use mocked providers; live connectivity and hosted CI execution are **Not run**. Earlier evidence remains historical and describes the code at each story boundary.

## Evidence table

| Story | State | Focused checks | Browser / Compose / live model | Notes |
| --- | --- | --- | --- | --- |
| ONK-001 | Implemented | 13 Vitest tests, lint, typecheck, Prisma validation and build passed | Compose and browser passed; live model Not run | Foundation only; see detailed evidence below |
| ONK-002 | Implemented | 66 new tests / 79 total, lint, typecheck and production builds passed | Compose + real HTTP with mocked provider passed; live model Not run | No chat UI or persistence yet; see evidence below |
| ONK-003 | Implemented | 55 new tests / 134 total, lint, typecheck and production builds | 12 browser cases; Compose and real HTTP with mocked upstream; live model Not run | In-memory chat only; see detailed evidence below |
| ONK-004 | Implemented | 139 unit + 11 PostgreSQL tests, lint/types/build | 20 browser cases; Compose restart/recreation and image audits; live model Not run | CI configured, hosted execution Not run; see evidence below |

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

## ONK-004 implementation verification — 2026-10-17

### Scope and environment

Implemented the approved final MVP story: Conversation/Message schema and additive migration, versioned history CRUD, server-owned context and transactional stream finalization, responsive history UI, deterministic PostgreSQL/browser tests, GitHub Actions and current documentation. No later story, auth, MCP, extra backend or provider was added. No dependency/version change was needed. Existing ONK-001/002/003 stacks, their data and the ignored root `.env` were preserved.

Checks ran from this WSL checkout using Docker because host Node is unavailable. Node **24.20.0**, npm **11.19.0**, PostgreSQL **18.6-bookworm**, Playwright **1.62.1** and Chromium **151.0.7922.34** were used. Source checks used this actual wrapper (replace `<command>` with a table command):

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  --mount type=bind,src="$PWD",dst=/app --workdir /app \
  --env CHECKPOINT_DISABLE=1 open-nook-ai-onk001-base <command>
```

The isolated Compose project was `open-nook-ai-onk004`, web **33040**, database `open_nook_test_004`, own persistent volume. `/tmp/open-nook-onk004.env` held synthetic local DB settings and an empty provider key. Database-test containers joined `open-nook-ai-onk004_default` with `TEST_DATABASE_URL` pointing to that DB. Nothing truncated personal tables or deleted any volume.

### Commands and observed outcomes

| Actual command | Observed result |
| --- | --- |
| `npm run db:generate` | Passed with Prisma 7.10.1 and both application models |
| `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` | Generated the additive history SQL; original foundation migration bytes left unchanged |
| `npm run db:migrate` against the isolated DB | Passed; foundation + conversation-history migrations applied. Subsequent starts reported no pending migrations |
| `npm test -- tests/chat.test.ts tests/chat-transport.test.ts` | First run: 51/52 passed; the old UTF-8 test expected the full client context on the wire. Updated it for latest-prompt-only transport; the server still enforces complete context limits |
| `npm test` | Final full suite passed: **139 tests in 7 files**, all provider calls mocked/blocked by default |
| `npm test -- tests/chat.test.ts` | After the final safe finish-reason correction, all **51** chat tests passed again |
| `npm run test:db` | **11 tests passed** against real isolated PostgreSQL, including the mapped Host/Origin regression. An initial merged Vitest config mistakenly selected unit files; it was replaced with a dedicated config before recording DB proof |
| `npm run lint` | Final pass, zero warnings. Earlier passes exposed render-time assignment of a callback ref and a missing effect dependency; fixed by assigning in an effect with complete dependencies. One narrowly documented suppression covers the SDK's event callback, which the lint analyzer treats as a constructor-time call |
| `npm run typecheck` | Passed for application, generated route/client types and all TypeScript tests/configuration |
| `docker compose --env-file /tmp/open-nook-onk004.env -p open-nook-ai-onk004 -f compose.yaml -f compose.dev.yaml build web` | Passed, including clean dependency install, `npm run build`, Prisma generation and integrated TypeScript. Final image rebuilt after review correction; five dynamic API paths and the static chat page compiled |
| CI YAML validation using installed `js-yaml` in the Node container | Passed: push/PR triggers, read-only permissions, immutable action SHAs, required commands, no CI-secret reference. Initial attempt to import uninstalled `yaml` failed; used existing ESLint `js-yaml` instead, with no added dependency |

The DB suite proves stable ordering, stored-context continuation, safe metadata, one winner in a simultaneous version race, replay rejection, same-row regeneration, late-callback rejection, stopped/failed history, lease recovery, empty-completion handling, context/message limits, pagination, version/active deletion guards, cascade and HTTP CRUD. Unit tests additionally prove no provider access before the initial DB commit and no successful SSE finish after a failed final save. Default tests do not connect to a real provider.

### Browser and runtime proof

Temporary Compose override `/tmp/open-nook-onk004-check/compose.mock.yaml` mounted the versioned `tests/fixtures/openrouter-mock.mjs` and set its explicit test flag, literal fake key and `test/model-one`. The preload refuses a non-test database/key and replaces the fixed upstream endpoint; every other server fetch throws. Health probes unset the preload. The six persistence browser cases used real Next.js Route Handlers, AI SDK/OpenRouter adapter, Prisma and PostgreSQL; they did not replace application API responses.

```bash
docker compose --env-file /tmp/open-nook-onk004.env -p open-nook-ai-onk004 \
  -f compose.yaml -f compose.dev.yaml \
  -f /tmp/open-nook-onk004-check/compose.mock.yaml up -d --wait --wait-timeout 120

docker run --rm --user "$(id -u):$(id -g)" --network host \
  --mount type=bind,src="$PWD",dst=/app \
  --mount type=bind,src=/home/zsolti-wsl/.cache/ms-playwright,dst=/ms-playwright,readonly \
  --workdir /app --env PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  --env E2E_BASE_URL=http://127.0.0.1:33040 --env E2E_PERSISTENCE=1 \
  open-nook-ai-browser-tools npm run test:browser
```

- Final full suite: **20/20 passed** across desktop/light 1280×900 and mobile/dark 360×800. Seven API-isolated UI scenarios verify rich rendering/real diagram labels, clipboard, keyboard/model choice, explicit regeneration, hostile content, disabled configuration, registry retry, visible-output retention after failed history sync and selected-chat recovery. Three full-stack journeys verify create/reload/resume/copy/reopen/delete, Stop/reload/regenerate with stable IDs, and persisted failures without duplicates.
- Initial full-stack browser run: the 12 then-existing isolated UI cases passed, while all six DB journeys failed. Trace showed `POST /api/conversations` returning `403`: the original Origin check used the internal container URL/port. Fixed it to compare the browser Origin with the incoming Host and protocol, added unit + DB regressions, then all journeys passed. Foreign origins remain rejected.
- After the final image rebuild and web/db recreation, `npm run test:browser -- tests/browser/history.spec.ts` passed **all six** persistence cases again. No real OpenRouter call was made.
- `python3 /tmp/open-nook-onk004-check/persistence.py create`, then `check`, stored a completed two-message synthetic fixture and compared SHA-256 of its full JSON detail. `docker compose ... restart web db`, health/readback, then `docker compose ... up -d --force-recreate --wait --wait-timeout 120` and another readback all passed. Conversation UUID/version/timestamps and message IDs/order/content/status/metadata were unchanged; the original volume was reused.
- `node /checks/visual.mjs` in `open-nook-ai-browser-tools` captured actual saved-history views at desktop/light and **320 px/mobile/dark**, plus the open mobile History panel. Two persisted messages loaded; no page errors or horizontal document overflow. Captures are `/tmp/open-nook-onk004-check/history-*.png`; these are actual app views using a clearly synthetic conversation.
- Network-disabled final production-image audit (`node /image-audit.mjs` in `open-nook-ai-onk004-web`) passed: no `.env*`, baked runtime settings, test/agent directories, Vitest/Playwright/jsdom, or provider endpoint/private settings in **103 client JavaScript files**. Actual local/test secret values were read for comparison but never printed.

### Delivery limits and review

- [GitHub Actions](../../../.github/workflows/ci.yaml) is configured with PostgreSQL service, pinned Node/npm and immutable official checkout/setup-node/upload-artifact revisions. It runs lint, types, unit tests, migrations, isolated DB tests, build and all guarded mock browser journeys without API secrets. **Hosted execution: Not run**; no push or remote run was authorized.
- **Live OpenRouter connectivity, current model compatibility, real provider cancellation/billing and charged generation: Not run.** No billable test was requested. Mocks are not cloud-connectivity proof. Windows-host browser execution: **Not run**; evidence is Linux Chromium in Docker.
- Reviewed tracked and new source/tests/config/docs together. Source SPDX boundaries, exact dependency/lockfile pins and local documentation links were audited using `python3 /tmp/open-nook-onk004-check/audit.py`; private values were absent from candidate files. Whitespace checks passed, preserving generated migration SQL's existing blank-at-EOF convention. Staged diff was empty; implementation did not commit or push.
- The app remains single-user, unauthenticated and localhost-only. One active request per conversation is not a global cost/rate limit. History is bounded to 32 stored messages, 8,000 UTF-16 units per context message and 24,000 context total; no silent history truncation or automatic paid retry occurs.

- Final restoration: `docker compose --env-file /tmp/open-nook-onk004.env -p open-nook-ai-onk004 -f compose.yaml up -d --force-recreate --wait --wait-timeout 120` passed. Read-only Docker/HTTP assertions confirmed healthy non-root web/db, `127.0.0.1:33040`, no published DB port, the same persistent volume, an empty provider key, disabled chat, no fixture mount or `NODE_OPTIONS`, and all earlier ONK-001/002/003 containers healthy. Saved-history fingerprint still matched after restoration. `docker compose ... config --quiet` and `exec -T web ./node_modules/.bin/prisma migrate status` passed with both migrations current. The isolated local runtime remains available at **http://127.0.0.1:33040**; existing `.env` settings were not activated or changed.

## Local runtime consolidation — 2026-10-17

After commit `e662a82`, the user requested removal of duplicate OpenNook containers and a current-source redeployment. Four isolated story stacks (`open-nook-ai-onk001` through `open-nook-ai-onk004`) were running eight containers. The only saved history in those stacks was the previously recorded two-message restart fixture; its full fingerprint still matched before shutdown. All four old PostgreSQL volumes were preserved offline. The normal `open-nook-ai` project now uses its own persistent `open-nook-ai_postgres_data` volume and the user's existing `.env` settings. Only ignored `.env` `APP_PORT` changed, from occupied `3000` to `33040`; a masked SHA-256 comparison confirmed every other setting unchanged.

| Actual operation | Observed result |
| --- | --- |
| `docker compose -p open-nook-ai -f compose.yaml build web` | Passed from current source; Prisma generation, production compilation and integrated TypeScript passed |
| `docker compose -p open-nook-ai -f compose.yaml up -d --wait --wait-timeout 120 db` | Normal PostgreSQL initialized on its own new persistent volume and became healthy |
| `docker compose -p <old-project> -f compose.yaml down --remove-orphans` for the four exact story projects | Removed eight old containers and four old networks; no volumes or images deleted |
| `docker compose -p open-nook-ai -f compose.yaml up -d --force-recreate --wait --wait-timeout 120 web` | Current image started successfully; web/db healthy; both committed migrations applied |
| `docker compose -p open-nook-ai -f compose.yaml exec -T web ./node_modules/.bin/prisma migrate status` | Both migrations current |
| `node /checks/smoke.mjs` from `/tmp/open-nook-redeploy-check` in the Chromium tools container | Actual desktop/light and mobile/dark UI passed model-list matching, create/open/reload/delete of owned empty conversation fixtures and overflow checks; zero page errors, external requests or chat requests |
| Network-disabled production-image audit | Passed; no environment files, baked secrets or test tooling; 103 client JavaScript files contained no private settings or provider endpoint |
| Read-only Docker/HTTP/environment audit | Exactly two OpenNook containers, correct freshly built image, non-root web, no test mount/preload, localhost-only web `33040`, private DB, readiness connected and three configured models. All four old volumes retained identity; all 30 unrelated containers retained their IDs and running/stopped states |

The current local app is **http://127.0.0.1:33040**. Its normal runtime uses the configured server-side OpenRouter key; this deployment verification made **zero model requests**. Live provider connectivity/compatibility and billing behavior remain **Not run**. Temporary browser captures and audit helpers are under `/tmp/open-nook-redeploy-check`; the browser fixtures were deleted through the app after checks.

## ONK-003 follow-up — Mermaid percentage pie preview — 2026-10-17

The user reported a `mermaid` pie block appearing as code. Read-only inspection of the reported saved answer confirmed its correct fence, an unsupported `pie` family and numeric values suffixed with `%`. The same answer also contained a separate invalid variant with inline color strings and `//` comments; that unsupported variant continues to retain its source with a failed-preview status.

Added bounded pie support to the existing strict/sanitized Mermaid renderer. The pie subset accepts an optional title/showData and unique quoted labels with positive, bounded numeric values. When every value has a trailing percent sign, only those suffixes are omitted for preview parsing. Original message/Copy code text and numeric values remain unchanged. Mixed units, malformed values, duplicate labels, unsafe directives and inline styling remain rejected. The supplied values sum to **122.4%**, so the preview explicitly explains that slices show shares of their actual total; it does not silently present the source values as percentages of 100. See [supported rendering](../../rendering.md) and [Mermaid pie syntax](https://mermaid.js.org/syntax/pie.html).

| Actual command/check | Observed result |
| --- | --- |
| `npm test -- tests/render-policy.test.ts` in the Node tools container before the fix | Reproduced the exact reported input: 1 failure, 32 earlier cases passing |
| `npm test -- tests/render-policy.test.ts tests/renderers.test.tsx` | **68/68 passed**: 51 policy and 17 component/SVG regressions, including exact pie normalization, native numeric/showData handling, original percent labels, malformed/ambiguous values and hostile inputs |
| `npm run lint` and `npm run typecheck` | Passed, zero lint warnings; no dependency changes |
| `docker compose -p open-nook-ai -f compose.yaml build web` | Production build and integrated TypeScript passed |
| `docker compose -p open-nook-ai -f compose.yaml up -d --no-deps --force-recreate --wait --wait-timeout 120 web` | Updated only the local web runtime; readiness healthy |
| `E2E_BASE_URL=http://127.0.0.1:33040 npm run test:browser -- tests/browser/chat.spec.ts` in the cached Chromium tools container | **16/16 passed** in desktop/light and mobile/dark: actual pie SVG with ten paths, Unicode/title/C#/C++ labels, transparent total note and exact original Copy code, plus existing rich-content/control/hostile regressions. Model/chat/history endpoints mocked before navigation; no billable calls |
| `node /checks/saved-diagram.mjs` with `/tmp/open-nook-pie-check` mounted in the same Chromium container | The user's actual saved conversation rendered the first pie with ten slices and labels in both viewports, with no document overflow, page errors, external requests or model calls. Captures: `/tmp/open-nook-pie-check/saved-pie-{desktop,mobile}.png`, visually inspected |
| Read-only target-message/database identity comparison | Original saved-answer MD5, database container ID and persistent volume remained unchanged |

These are local rendering checks, not verification of the example's programming-language statistics. The provider API was not invoked. The broader unit/database suites, a hosted CI run and paid generation were not rerun for this renderer-only change. Commit approval remains separate.

Final `python3 /tmp/open-nook-onk004-check/audit.py` passed 81 local links, source notices, dependency/lock consistency and private-value scanning. `git diff --check` passed. The network-disabled `open-nook-ai-web` production-image audit passed again, including 103 client JavaScript files without private settings/provider code and no baked environment or test tooling. Normal runtime assertions confirmed healthy web/db, retained current API settings and no test preload. No commit or push was made.

## ONK-003/004 follow-up — LaTeX delimiters and model formatting guidance — 2026-10-17

The user reported plain LaTeX instead of rendered formulas and requested investigation of the rendering libraries and suitable model instructions. Read-only inspection of the saved answer found three complete `\[...\]` blocks and six `\(...\)` expressions, with no dollar delimiters. `remark-math` recognizes dollar math; Markdown was consuming the backslash delimiters before KaTeX received them. KaTeX CSS/fonts were already local. Reviewed the installed remark/micromark integration and official [KaTeX delimiter examples](https://katex.org/docs/autorender), [Mermaid pie syntax](https://mermaid.js.org/syntax/pie.html) and [Vega-Lite inline data](https://vega.github.io/vega-lite/docs/data.html#inline). No library/version change or external auto-render script was needed.

Added a bounded Markdown syntax extension for backslash math, preserving TeX row breaks, code examples, escaping and nested Markdown context. It feeds the existing trust-disabled KaTeX renderer; streaming, invalid/unfinished source and all prior security limits remain enforced. A server-owned formatting guide now supplies math, flowchart, pie and inline-data chart examples on each request. SDK/provider request tests verify the guide is the single server system message; clients still cannot inject system roles/options. The guide counts toward the existing 24,000-character/32-message context budget without being persisted in history. Examples are checked against the actual policies/KaTeX. The earlier pie correction is included unchanged.

Checks used the Node/Chromium Docker wrappers documented above, with mocked provider fetches. Database regressions used a temporary, port-free PostgreSQL container on `open-nook-ai-render-test`, with `--tmpfs /var/lib/postgresql` and the isolated `open_nook_test_render` database. No personal database rows were edited or deleted.

| Actual command/check | Observed result |
| --- | --- |
| `npm test -- tests/renderers.test.tsx` during implementation | First new fixture failed (0/8 formulas): initial parser extension omitted micromark line-ending tokens. After correcting token events, 18/18 passed; further focused regressions were then added |
| `npm test -- tests/renderers.test.tsx tests/render-policy.test.ts tests/formatting-prompt.test.ts tests/chat.test.ts` | Final **127/127 passed**: 24 component/SVG, 51 rendering policy, 1 guide-example and 51 chat/API cases. Includes cases/matrices/aligned rows, original TeX spacing, quotes/lists, dollar syntax, literal code/escaping, incomplete/oversized math, hostile resource commands and inert streaming |
| `DATABASE_URL=postgresql://open_nook:render-test-only@db:5432/open_nook_test_render npm run db:migrate` in the tools container on the temporary network | Both existing migrations applied to the empty temporary database |
| `TEST_DATABASE_URL=postgresql://open_nook:render-test-only@db:5432/open_nook_test_render npm run test:db` on that network | **12/12 passed**, including exact 24,000-character boundary with the server guide, rejection one character over before mutation, unchanged stored role/order and provider system-message delivery |
| `docker stop open-nook-ai-render-test-db` then `docker network rm open-nook-ai-render-test` | Temporary `--rm` container and network removed; no persistent test volume created |
| `npm run lint` and `npm run typecheck` | Final passed. Initial typecheck caught absent remark-parse extension type registration; resolved with a type-only import |
| `docker compose -p open-nook-ai -f compose.yaml build web` | Production build and integrated TypeScript passed; final image `sha256:f71d87a317d226323b314c0635c0cfda4de89997d6313ba730538c9f955fce26` |
| Network-disabled `node /image-audit.mjs` in `open-nook-ai-web` using the prior audit helper | Passed: no environment files, baked private values, test tooling or private settings/provider endpoint in 103 client JavaScript files |
| `docker compose -p open-nook-ai -f compose.yaml up -d --no-deps --force-recreate --wait --wait-timeout 120 web` | Updated web only; healthy on `http://127.0.0.1:33040` |
| `E2E_BASE_URL=http://127.0.0.1:33040 npm run test:browser -- tests/browser/chat.spec.ts` | **18/18 passed** across desktop/light and mobile/dark. Formula/row rendering, loaded local fonts, exact copied source, real Mermaid/Vega SVGs, prior pie and hostile/control regressions; model/chat/history endpoints intercepted before navigation |
| `node /checks/saved-math.mjs` with `/tmp/open-nook-math-check` mounted in the Chromium container | Actual saved answer: **9 rendered formulas, including 3 display blocks**, in both viewports; row spacing and exact Copy message preserved; local fonts loaded. Zero page errors, document overflow, external requests, model requests or mutations. Captures: `/tmp/open-nook-math-check/saved-math-{desktop,mobile}.png` |
| `python3 /tmp/open-nook-math-check/preservation.py before` / `after` | Original answer MD5, DB container ID and persistent volume identical after deployment |

The actual saved answer ends with an additional unfinished math block. Its stored `finishReason` is `length`: generation stopped at the configured output limit. That incomplete suffix remains readable source; the renderer does not invent missing mathematics or modify the saved answer. Provider-wide generation quality with the new guide and hosted CI remain **Not run**; all checks made zero paid generation requests. Commit/push approval remains separate.

Final saved-answer desktop/mobile captures were visually inspected: cases and coefficient matrices display correctly in the actual app. `python3 /tmp/open-nook-onk004-check/audit.py` passed 83 local links, source notices, package/lock pins and private-value scans; `git diff HEAD --check` passed. Read-only runtime assertions confirmed the fresh image, healthy non-root localhost web and private DB, no test preload/mount, exactly two OpenNook containers and removal of the temporary test container/network. No commit or push was made.

## ONK-003/004 follow-up — progressive previews, prompt coverage and window context — 2026-10-17

The user requested an audit and implementation of missing renderer examples, concise/consistent system instructions, display-only virtual closure during streaming, and preservation of window/conversation context. Reviewed the installed React/AI SDK/remark integrations and primary [react-markdown security](https://github.com/remarkjs/react-markdown#security), [KaTeX API](https://katex.org/docs/api.html) and [Mermaid usage](https://mermaid.js.org/config/usage.html) documentation. No dependency, database schema, provider, agent or later story was introduced.

### Existing behavior and targeted additions

- Already present: one server-owned formatting guide with KaTeX, flowchart/pie and Vega-Lite examples; safe Markdown/GFM/Prism rendering; strict/sanitized graphics; persistent ordered history, server-owned completed context, reload via conversation URL, version guards and explicit context limits. Stopped/failed assistant text is saved but excluded from completed model context.
- Added to the same guide: Markdown table/tasks and code examples, sequence/class/state/ER examples, clearer language/conciseness/data-preservation instructions, and explicit completion rules. All six supported Mermaid families are represented; `graph` shares flowchart syntax, LaTeX uses KaTeX, and DOMPurify/SDK/runtime components do not require a separate model-authored format. The actual guide is **2,233 characters**, with a tested ceiling of 3,200 and the existing 24,000-character total context bound. Repeated per-language/per-chart examples were avoided where the same grammar applies.
- Previously absent: live rich previews. Added EOF acceptance for partial inline/backslash math, bounded temporary TeX braces/environment closures, schema-checked temporary JSON closures, existing Markdown EOF-fence handling with live Prism highlighting, and at most four Mermaid complete-prefix attempts. No data, formula operands or semantic diagram statements are invented. Repairs are discarded when streaming stops and never enter SDK messages, copy text, HTTP context or PostgreSQL.
- Added smoothness controls: 50 ms SDK UI updates, 250 ms non-debounced graphic sampling, one in-flight preview per streaming graphic, shared lazy Mermaid loading, stable React renderer identities and memoized unchanged math. Previous safe SVGs can remain during incomplete syntax; final invalid/unsafe source does not inherit a completed-looking preview. Four previews per part, SVG sanitation, resource-denying loaders and trust-disabled KaTeX remain enforced.
- Model choice previously reset on browser reload. The allowed model ID now survives in tab session storage, with guarded storage access and validation against the current server registry. No message text or key is written to browser storage. Conversation history itself remains in PostgreSQL, selected by its URL.

### Commands and observed checks

Source checks used the cached Node 24.20.0/npm 11.19.0 Docker wrapper above. The temporary integration environment was `open-nook-ai-stream-test-db` on network `open-nook-ai-stream-test`, PostgreSQL 18.6, `--tmpfs /var/lib/postgresql`, no DB host port and database `open_nook_test_stream`. A temporary web container published **127.0.0.1:33041** with only the fixed synthetic key/model, explicit mock-provider flag and read-only fixtures-directory mount. Its preload denies every external fetch except the fixed, locally mocked provider endpoint. Personal history was not used for tests.

| Actual command/check | Observed result |
| --- | --- |
| `npm test -- tests/renderers.test.tsx tests/streaming-preview.test.ts tests/formatting-prompt.test.ts tests/chat.test.ts tests/render-policy.test.ts` | **139/139 passed**: 33 component/SVG, 3 virtual-closure policy, 1 prompt-example, 51 API and 51 rendering-policy cases. Covers structural bounds, unsupported/hostile data, literal code/escaping, partial math, original copy text, same SVG element across updates, unsafe/final invalid clearing and the four-graphic budget |
| `DATABASE_URL=postgresql://open_nook:stream-test-only@db:5432/open_nook_test_stream npm run db:migrate` on the temporary network | Both existing migrations applied to the empty test DB |
| `TEST_DATABASE_URL=postgresql://open_nook:stream-test-only@db:5432/open_nook_test_stream npm run test:db` on that network | **12/12 passed**, including stored context at the provider boundary and the updated guide's exact context-budget boundary |
| `npm run lint` and `npm run typecheck` | Passed; final production build also typechecked application and tests |
| `docker compose -p open-nook-ai -f compose.yaml build web` | Passed after the shared-module loading correction; image `sha256:5e659e4d0287a2756a81d8ef73b53703cd1e7de7b8f553b61f46cb12f753f50d` |
| Network-disabled production `node /image-audit.mjs` | Passed: no environment files, baked private values, test dependencies or private settings/provider code in 103 client JavaScript files |

Initial component runs caught slow/concurrent diagram loading in the unit environment. Component tests now stub SVG production while exercising preview state/security, and the actual libraries are verified in Chromium; the shared lazy module promise also avoids repeated concurrent imports. An initial full browser run passed 32/36: two new Mermaid cases had ambiguous nested image-role selectors, and the context cases needed an exact toolbar selector plus waiting for the asynchronous conversation URL change before reload. Those test synchronization/selectors were corrected; all 16 history journeys then passed before the final-image rerun.

Full browser command, against the built image and guarded test server:

```bash
docker run --rm --user "$(id -u):$(id -g)" --network host \
  --mount type=bind,src="$PWD",dst=/app \
  --mount type=bind,src=/home/zsolti-wsl/.cache/ms-playwright,dst=/ms-playwright,readonly \
  --workdir /app --env PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  --env E2E_BASE_URL=http://127.0.0.1:33041 --env E2E_PERSISTENCE=1 \
  open-nook-ai-browser-tools npm run test:browser
```

**36/36 passed** in desktop/light 1280×900 and mobile/dark 360×800: 20 API-isolated UI cases and 16 real-HTTP/SDK/Prisma/PostgreSQL journeys. All six actual Mermaid prompt examples rendered with labels. The four live-preview fixtures send 20-character chunks at 60 ms intervals and leave the stream open. Tests see formatted partial math/code/Mermaid/Vega while the DB assistant is still `pending` with empty content, then copy the exact received source, Stop, compare stored `stopped` content byte-for-byte and reload/copy again. No virtual delimiter is stored. The context fixture rejects missing/mixed earlier turns at the mocked provider boundary; reload and switching between two conversations both preserve the correct earlier user/assistant exchange. The model-selection test verifies the chosen allowed ID survives reload. Preview captures are under ignored `test-results/live-{math,code,mermaid,chart}-{desktop-light,mobile-dark}.png`; actual desktop math and mobile Mermaid captures were visually inspected. No page errors or remote browser requests occurred in the live-preview checks.

`docker stop open-nook-ai-stream-test-web open-nook-ai-stream-test-db` and `docker network rm open-nook-ai-stream-test` removed the temporary `--rm` containers, memory-only test data and network. No personal volume was deleted. Source/security audits and the normal runtime readback follow below; paid generation quality, live-provider model compliance and hosted CI remain **Not run**. Commit and push are not included in this implementation approval.

Final diff review found a case-normalization edge in the new AST graphic budget: uppercase fence languages were recognized by the renderer but not counted by the budget. Normalized the budget's language names, added mixed-case component coverage and a five-uppercase-block browser assertion. Post-correction `npm test -- tests/renderers.test.tsx` passed **33/33**; lint, production build/integrated TypeScript and the network-disabled image audit passed again. Final image: `sha256:dbb9562dff31edf91a1d14f7d5e5b3ba3902bac862ab4d980d91512ddceee7e4`.

`docker compose -p open-nook-ai -f compose.yaml up -d --no-deps --force-recreate --wait --wait-timeout 120 web` deployed the final image to **http://127.0.0.1:33040**. The final `E2E_BASE_URL=http://127.0.0.1:33040 npm run test:browser -- tests/browser/chat.spec.ts` passed **20/20**, including real diagrams, all prompt examples and the mixed-case graphic limit. These UI cases mock all model/chat/history endpoints before navigation; they did not alter personal data or call a real provider. The 16 full-stack history journeys were not repeated for this case-only budget correction.

Normal read-only browser checks (`node /checks/saved-math.mjs` with `/tmp/open-nook-math-check`) still rendered the original user's nine closed formulas, local fonts and exact copied source in both viewports, with zero mutations/model requests/errors/external loads. The saved-answer MD5, original DB container and persistent volume were unchanged after both web recreations. Final runtime checks found exactly two healthy OpenNook containers on the current image, without a test preload or mount. The earlier live-preview captures were inspected before the final UI rerun replaced ignored `test-results` artifacts. No commit or push was made.

## User-requested branding follow-up — 2026-10-19

Adapted the StoryCheck AI, StonePlan AI and LocalNook patterns to OpenNook's existing `brand/branding.json` and poster. The header now contains the app icon/name, New chat, model selection and About; mobile History remains available. The sidebar attribution stays below the scrolling history and shows the current year, author, Apache-2.0 and author website. A native modal About dialog includes the unchanged poster, configured project/author links, support links, full-URL focus/hover tooltips and the existing voluntary-support notice. Escape, backdrop and close-button dismissal preserve the draft and model selection.

Added a handwritten SVG icon using the poster's forest-green, cream, mint and gold speech bubbles; the same asset supplies the app icon and browser favicon. No poster was replaced. `scripts/prepare-brand.mjs` packages configured local artwork and a byte-identical copy of the root license before development/build; the Docker runner now includes these public assets. Brand metadata supplies page metadata and visible attribution. Existing unrelated worktree changes were preserved; no new story, dependency, provider, schema, commit or push was introduced.

Commands using npm ran in cached Node 24.20.0 containers, mounting the checkout at `/app` with UID/GID 1000. Browser commands additionally used the existing Chromium tools image, host networking and the read-only `/ms-playwright` cache.

| Command/check | Observed result |
| --- | --- |
| `npm test -- tests/chat-transport.test.ts tests/ai-config.test.ts` | **26/26 passed**; model registry and request transport regressions |
| `npm run typecheck` | Passed; Prisma generation, Next route types and TypeScript |
| `npm run lint` | Passed with zero warnings; the final JSON-import test adjustment was also checked separately with `npm exec -- eslint tests/browser/branding.spec.ts --max-warnings=0` |
| `docker compose build web` | Passed; final production image `sha256:249dc129fd7f78c64590415b22214f1d82c266c9e8178cd34fc7d1cb3d46b1bf`, including integrated TypeScript checking |
| `docker compose up -d --no-deps --force-recreate --wait --wait-timeout 90 web` | Final web image healthy on **127.0.0.1:33040**, Compose project `open-nook-ai`; the original DB container and `open-nook-ai_postgres_data` volume remained in place |
| `E2E_BASE_URL=http://127.0.0.1:33040 npm run test:browser -- tests/browser/branding.spec.ts tests/browser/chat.spec.ts` | Final run **26/26 passed** in desktop/light 1280×900 and mobile/dark 360×800, with additional 320×740 cases. Covers icon/favicon/poster loading, configured links, modal dismissal/focus, draft/model preservation, new chat, scrolling history/footer, narrow tooltips and all existing chat/rendering journeys |
| `node /checks/review.mjs` with `/tmp/open-nook-brand-review` mounted in the browser tools container | Actual unmocked, read-only deployed UI checked at 1280×900 light/dark, 390×844 dark and 320×740 light: no page errors, horizontal page/dialog overflow, out-of-viewport support tooltip, mutation/model request or external request. Captures remain outside Git in `/tmp/open-nook-brand-review/`; desktop About, mobile header/support and 16/32/64/96px icon captures were visually inspected |
| Runtime HTTP and SHA-256 comparisons | `/`, `/api/health`, icon SVG, poster SVG and `/license.txt` returned **200**. Public artwork/license matched the source files byte-for-byte; readiness reported `{"status":"ok","database":"connected"}` |
| Read-only ordered PostgreSQL row fingerprints before/after deployment and browser checks | Identical **6 conversations / 16 messages**, including all saved content and metadata; original DB volume and container preserved |
| SVG XML parsing, script syntax and `git -c core.whitespace=cr-at-eol diff HEAD --check` | Passed |

The first browser attempt exposed a test-only ESM JSON import requirement, corrected using `with { type: "json" }`. The next run identified tooltips missing after direct focus following mouse interaction; showing them for any link focus fixed all four affected desktop/mobile cases. The final full affected browser run passed. Browser chat/model/history requests use deterministic intercepted responses; the separate visual review reads real deployed state and blocks mutations/generation. Live paid-provider generation, database integration-suite reruns and hosted CI were **Not run** for this UI-only follow-up.

## Screenshot-aligned About and attribution — 2026-10-19

The user supplied LocalNook, StoryCheck and StonePlan screenshots to clarify the requested shared layout. Updated About to show the unchanged OpenNook poster, a centered description, website/Source/GitHub profile buttons, a second centered Buy me a Coffee/Ways to support row, a separated support notice and a centered single-line copyright/license footer. Removed the extra standalone tagline and support heading. The sidebar now displays `© current-year Keresztes Zsolt, Apache-2.0` on one line and the author website below it. The header's About button has no info icon and shares New chat's font weight; dialog close remains available in a circular button. Tooltip placement now follows the focused/hovered link, including wrapped button rows.

The user's additional request removed the initial “History is saved on this device” sentence and its empty status-row space. Saving, saved and failed-save indicators remain; the existing save-failure/recovery browser case still passes.

- `npm exec -- eslint src/components/brand/about.tsx src/components/brand/attribution.tsx src/components/chat/chat.tsx tests/browser/branding.spec.ts --max-warnings=0` in the cached Node 24.20.0 container: passed.
- `docker compose build web`: passed, including TypeScript checking. Image: `sha256:b20e20454bbe56c936a2ed2622eb84782a1e5e1a6af0af3831bdd29b4187173b`.
- `docker compose up -d --no-deps --force-recreate --wait --wait-timeout 90 web`: healthy on `127.0.0.1:33040` in project `open-nook-ai`; the original DB container and volume were retained.
- `E2E_BASE_URL=http://127.0.0.1:33040 npm run test:browser -- tests/browser/branding.spec.ts tests/browser/chat.spec.ts` in the cached Chromium tools container: **26/26 passed** across desktop/light and mobile/dark, including extra 320px cases. Assertions cover the removed header icon/status row, updated link destinations, copyright/license on one line, website below, modal behavior, narrow tooltips and existing chat/save/rendering journeys.
- `node /checks/review.mjs` with `/tmp/open-nook-brand-review` mounted in the browser tools container: actual deployed UI checked at 1280×900 light/dark, 390×844 dark and 320×740 light. No page errors, external requests, mutations, generation calls or horizontal page/dialog overflow; tooltips stayed in the viewport. Screenshots under `/tmp/open-nook-brand-review/reference-layout/` were visually compared with the supplied examples, including desktop About/sidebar and mobile About/support.
- Final health endpoint: HTTP **200**, `{"status":"ok","database":"connected"}`. Ordered PostgreSQL row fingerprints remained identical: **6 conversations / 16 messages**, with the original `open-nook-ai_postgres_data` volume.

No dependency, provider, schema, branding value, icon or poster changed in this refinement. No live model calls, database integration-suite reruns, hosted CI, commit or push were performed.

## Compact model picker, focus and menu alignment — 2026-10-19

The user clarified that the model selector's width, focus border, arrow and detached native list felt inconsistent. Replaced the browser-specific native select presentation with a focused `ModelSelect` component using the already installed **`@radix-ui/react-select@2.4.1`**. Promoted that exact version to a direct dependency; package and lockfile each gained only the root dependency entry, with no transitive version changes. The offline lockfile update lacked registry metadata; the normal exact-version, lockfile-only npm update succeeded without running package scripts.

The trigger and menu share a compact width (160–224px), border/radius and theme colors. The arrow has its own space, the trigger uses a continuous subtle focus ring, and the selected item has a checkmark. The menu appears immediately below the trigger with matching width/alignment. Full long labels wrap in the scrollable list while the trigger truncates without expanding the header. The tablet layout no longer forces the selector to fill a separate row; the narrow-phone layout keeps its existing grouping. Keyboard arrows, Home/End, Enter, Escape, outside dismissal and retained model choice are handled by the selection primitive. Model IDs, configured allowlist, API transport and busy/disabled behavior remain unchanged.

| Check | Observed result |
| --- | --- |
| `npm test -- tests/chat-transport.test.ts` in the cached Node 24.20.0 container | **6/6 passed** |
| `npm exec -- eslint src/components/chat/model-select.tsx src/components/chat/chat.tsx tests/browser/branding.spec.ts tests/browser/chat.spec.ts --max-warnings=0` | Passed; final test additions also passed a focused lint rerun |
| `docker compose build web` | Passed with integrated TypeScript checking; image `sha256:a19baf8759c4e803992a3fd03abf0aadf17167c1e431346457490c47d434ca6a` |
| `docker compose up -d --no-deps --force-recreate --wait --wait-timeout 90 web` | Healthy on `127.0.0.1:33040`; original DB container and volume preserved |
| `E2E_BASE_URL=http://127.0.0.1:33040 npm run test:browser -- tests/browser/branding.spec.ts tests/browser/chat.spec.ts` in the Chromium tools container | **30/30 passed**, desktop/light and mobile/dark. Added real keyboard navigation/commit/cancel, focus restoration, hover/outside dismissal, reload persistence, and five long model IDs at 1280/820/768/640/390/320px; existing model request, unavailable configuration, save recovery, rendering and About checks also passed |
| `node /checks/layout.mjs before` / `after` with `/tmp/open-nook-model-check` mounted in the Chromium tools container | Actual deployed UI at 1280/1000/820/768/640/390/320px: no horizontal overflow; menu width and left edge matched the trigger within 1px. At 1280px the trigger shrank from **307 to 224px**; at 768px from **694 to 160px**, and header height at 768/640px fell from **166 to 118px**. Captures under `/tmp/open-nook-model-check/after/` include closed/focused/open states; desktop focus and desktop/tablet/phone menus were visually inspected |
| Final health and ordered DB fingerprints | HTTP **200**, database connected; the same **6 conversations / 16 messages** and row fingerprints remained in `open-nook-ai_postgres_data` |

The browser suites intercept model/chat/history APIs; the separate deployed-layout review permits only same-origin GETs and opens/closes the current model menu without selecting or generating. No live provider call, data mutation, DB-suite rerun, hosted CI, commit, push or index change was performed. Existing staged work remained staged; this follow-up is left unstaged for review.

## Commit review — 2026-10-19

The user explicitly requested committing the OpenNook changes. Reviewed the complete staged and unstaged diff, including the existing Docker defaults/documentation and the new model-picker file. An audit of index/worktree contents against private local configuration values and credential patterns found no exposure; `.env` is ignored and untracked. Package/lock metadata and SVG assets passed consistency checks. The production build, lint, six transport tests and 30 browser checks above still apply to the unchanged application/test source; they were not repeated for this commit-only request. `git -c core.whitespace=cr-at-eol diff HEAD --check` passed. No push was requested.

## 2026-10-19 — Function-based consumer names and one root metadata source

The user explicitly limited this naming cleanup to CiteNook, ContestCheck, OpenNook, LocalNook, StonePlan and StoryCheck. Root `brand/` is the editable data/artwork source; consuming modules, components, scripts, styles, tests and guides use their function. The rule is recorded in `AGENTS.md`. The six source catalogs and all artwork were checked by SHA-256 against the task-start snapshot (25 JSON/artwork files unchanged). Existing unrelated pending changes and historical result fixtures were retained. No commit or push was requested.

Moved reusable shell components to `src/components/app-shell`, metadata consumption to `src/shared/app-info.ts`, preparation to `scripts/prepare-app-assets.mjs`, generated public copies to `public/app-assets`, and focused browser tests to `about.spec.ts`. Selectors/helpers use author-attribution, About/link and app-info names. The root JSON/artwork, database/storage identities and model-selection implementation remain unchanged.

`npm run typecheck`, `npm run lint` and 178 unit tests passed. Docker built the production app with its pinned Node version and refreshed only web; the DB container/mounts/ports are unchanged. All 10 existing About/header/sidebar/model-menu browser cases passed across desktop light and mobile dark, with private API/provider responses intercepted by fixtures. The initial keyboard test sent Enter before the UI library's deferred End-key focus update; it now explicitly waits for the last option to be focused before selection. The model-selector source itself is byte-for-byte unchanged. The final edited test also passed targeted ESLint.

Cross-repository proof: **540 unit/API tests and 56 browser cases/scenarios passed**. Scoped filename/local-link/whitespace checks and the deployed source/asset/container audit passed. Local helper scripts, build/deploy logs, summaries and captures remain under `/tmp/app-ui-naming/`; they are not committed. Database containers and named mounts were preserved; untouched services retained their original policies. No live/paid model generation, new indexing or submitted-code execution was run. Hosted CI/public deployment and other browser engines were not tested.
