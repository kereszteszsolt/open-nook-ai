# Verification approach — chat and MCP discovery

ONK-001–004 include Vitest checks for database configuration, health, model allowlisting, the real AI SDK/OpenRouter adapter with mocked fetch, client context and safe content rendering; `npm run test`, `npm run lint`, `npm run typecheck` and `npm run build` provide local foundation checks. See [Local development](development.md) and the release [verification](releases/release-0.1-mvp/verification.md) for actual commands and outcomes. The [GitHub Actions workflow](../.github/workflows/ci.yaml) runs lint, types, unit tests, migrations, isolated PostgreSQL tests, build and mocked Chromium journeys. A workflow file is not evidence of a hosted run; see verification for that boundary.

| Layer | Verification |
| --- | --- |
| Next.js + configuration | Framework start, server/client separation, environment validation and health route |
| Models / API | Vitest unit/API checks for empty/duplicate config, invalid model and provider errors using mocks |
| Streaming | Controlled stream fixtures for ordering, Stop, Retry, timeout, failure and partial responses |
| Rich rendering | Tests for GFM, code copy, KaTeX, Mermaid/Vega valid and hostile payloads; browser smoke |
| Persistence | Prisma migrations, conversation order, deletion, transactions and restart persistence |
| UI | Playwright browser checks for model picker, chat, controls, history and accessibility basics |
| Docker | Compose config/build, locally bound port, persistent database, healthy reload |
| CI | Mock-only tests, lint/typecheck/build with no OpenRouter secret required |

The provider suite covers malformed/oversized input, request byte limits, safe HTTP/network/SSE failures, partial-response loss, redirects, deadlines before headers and during streaming, client disconnects, output limits and timer cleanup. The test setup clears provider settings and denies unmocked global fetch. There is no live-provider test in the default suite. The `server-only` Vitest alias applies only to tests; production imports retain the Next.js server boundary.

## Evidence rules

Every completed story records the **actual command**, date, platform, observed output and any limitations in its release [verification](releases/release-0.1-mvp/verification.md). If a check was not run, say `Not run` rather than `Passed`.

Live OpenRouter smoke testing is an **explicitly approved** exception: use non-sensitive prompts, a configured billable model and tight limits. Report the actual tested model ID and result. Passing mocks do **not** prove cloud connectivity.

## Story closeout

The final story checks README/roadmap accuracy, link integrity, dependency versions, license-header policy, security caveats, Docker restarts, representative real-model behavior (only when approved) and screenshots only if actual image assets have been captured.

## Isolated database checks

`npm test` blocks unmocked fetch and does not need PostgreSQL or an API key. `npm run test:db` is a separate suite requiring `TEST_DATABASE_URL` whose database name begins `open_nook_test`. Create that database separately; never point tests at existing personal data. Migrate it using the same URL:

```bash
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
npm run test:db
```

The suite creates UUID-owned fixtures and removes only those rows, without truncating tables or deleting volumes. It covers ordered persistence/resume, version races, replay, stale finalization, partial/error states, lease recovery, bounded context, pagination, cascade and HTTP CRUD. Build/type generation do not require a live database.

## Browser checks

```bash
npx playwright install chromium
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:browser
```

The default isolated port is `33040`. Start the app yourself; tests do not reconfigure services. Ten UI scenarios run desktop/light and mobile/dark, intercepting models/chat/history before navigation and blocking external browser requests. They verify real rich graphics/labels/code/math, clipboard controls, keyboard/model selection, regeneration, hostile content, disabled setup, registry recovery, failed history synchronization and unavailable selected-chat recovery. Browser captures/traces stay under ignored `test-results/`.

Full persistence journeys require a separate server using an isolated `open_nook_test*` database. The versioned Node preload replaces only server fetch to the fixed OpenRouter endpoint and denies all other fetches. It refuses to start without the exact synthetic key, explicit opt-in and test database. Do not use it on your normal app or real credentials:

```bash
# DATABASE_URL must already reference an isolated, migrated open_nook_test* database.
OPENNOOK_TEST_PROVIDER=1 OPENROUTER_API_KEY=onk004-test-only-key \
OPENROUTER_MODEL_1=test/model-one \
NODE_OPTIONS="--import=$PWD/tests/fixtures/openrouter-mock.mjs" \
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 33040
# In another terminal:
E2E_BASE_URL=http://127.0.0.1:33040 E2E_PERSISTENCE=1 npm run test:browser
```

Eight additional journeys in both viewports use the real Next.js routes, Prisma and PostgreSQL: create/reload/resume/copy/reopen/delete, Stop/reload/regenerate with stable IDs, and failed-provider history without duplicate turns. They delete only their own fixture chats. The four live-preview journeys hold a real mocked-provider HTTP stream open, assert previews while the DB answer is still pending, then Stop/reload and compare exact original text. Another journey checks earlier user/assistant context at the provider boundary after reload and switching conversations. The preload imports the adjacent `streaming.ts` fixture; container overrides must mount the fixtures directory together. Without `E2E_PERSISTENCE=1` these sixteen cases are explicitly skipped. CI uses this guarded setup without any real OpenRouter secret. The synthetic provider does not prove live connectivity, compatibility, billing or hosted CI execution.

## ONK-005 MCP discovery

`npm test -- tests/mcp-config.test.ts tests/mcp-network.test.ts tests/mcp.test.ts tests/mcp-api.test.ts` runs deterministic configuration/address, socket/DNS, real-SDK fake HTTP and real-route tests. Default test setup clears MCP settings and disallows unmocked fetches. MCP tests substitute only the transport dependency or native socket/DNS boundary; they make no live Context7 request.

The four integration browser scenarios in `tests/browser/integrations.spec.ts` run in both viewports: missing configuration, failed discovery/retry/disable, cancellation with late results, and a real-route/SDK/fake-HTTP journey. The last scenario requires `E2E_MCP=1` and the guarded `tests/fixtures/mcp-mock.mjs` preload. It requires `OPENNOOK_TEST_MCP=1`, the literal synthetic fixture key and a test-named database; it substitutes HTTPS/DNS only inside the test process with a loopback fake server on port 3001. Never preload it on the normal stack. The fixture counter proves no automatic/repeated discovery or tool execution.

CI combines that preload with the existing OpenRouter fixture and runs all 44 browser cases using fake credentials. See [MCP configuration](mcp-configuration.md) for policy/transport limits and [Release 0.2 verification](releases/release-0.2-mcp-tool-integration/verification.md) for actual outcomes and live-test boundaries.
