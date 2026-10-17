# Release 0.2 — Verification

**Partially implemented locally: ONK-005 complete; ONK-006 Planned.** This file records observed ONK-005 results. Release 0.1 evidence remains unchanged; it does not imply implementation of ONK-006, runtime Skills or quizzes.

| Story | Implementation | Tests | Live integration / model | Notes |
| --- | --- | --- | --- | --- |
| ONK-005 | Implemented locally | 105 focused MCP tests; 286 total unit/API/rendering; 12 PostgreSQL; 44 browser cases | Not run | Fixed Context7 discovery only, no model tool execution |
| ONK-006 | Not started | Not run | Not run | No tool-calling evidence recorded |

## ONK-005 — 2026-10-17

The user explicitly requested implementation after the approved Release 0.1 review and commit. Base: `dev_r0.2`, `e625e08`. Added the official `@modelcontextprotocol/client@2.3.1` dependency, one fixed Context7 configuration and destination/tool policy, guarded Streamable HTTP discovery, a process-local enable/disable manager, one uncached API route and an accessible Integrations panel. Updated `.env.example`, Compose forwarding and focused documentation. No Prisma schema/migration, provider generation path, model prompt/tool loop, runtime Skill or agent was added. The ignored real `.env` was not edited.

### Acceptance criteria and scope

- Exactly one integration: Context7 at `https://mcp.context7.com/mcp`, disabled until configured **and** explicitly enabled. The only accepted tool names are `resolve-library-id` and `query-docs`, optionally narrowed by server configuration.
- Server-only key/URL/tool settings; strict browser actions cannot register URLs, credentials or tools. Socket-time DNS checks reject non-public addresses and pin approved results; TLS validation is explicit, pooled unchecked sockets are avoided and redirects fail closed.
- GET status, page loads, opening the panel and reload/refresh never initiate remote discovery. Disable immediately revokes pending work and clears tools; late results and concurrent enable requests cannot restore or multiply it.
- A 10-second total discovery deadline, bounded wire data/headers/requests/pages/tools/cursors, no retries/GET event channel/OAuth/fallback/tool calls, and only local descriptions/known names returned. Remote server instructions, schemas/icons and raw errors do not enter the browser, model context, logs or DB.
- Process-local state intentionally resets disabled after restart. Ready means a timestamped metadata snapshot, not continuous connectivity. No conversation is modified by discovery.

Configuration, precise limits and evidence boundaries: [MCP configuration](../../mcp-configuration.md). Primary references checked during implementation: [Context7 MCP configuration/tools](https://context7.com/docs/resources/all-clients) and the [official SDK connection guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/clients/connect.md). Only the selected transport is covered; no general MCP compatibility is claimed.

### Environment and commands

Windows-mounted WSL checkout; host Node unavailable. Node 24.20.0/npm 11.19.0, PostgreSQL 18.6-bookworm, Playwright 1.62.1 and cached Chromium tools were used. Source commands used:

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  --mount type=bind,src="$PWD",dst=/app --workdir /app \
  --env CHECKPOINT_DISABLE=1 open-nook-ai-onk001-base <command>
```

| Actual command/check | Observed result |
| --- | --- |
| `npm view @modelcontextprotocol/client version engines exports --json` | Verified stable 2.3.1 and Node >=20 support; selected current official client exports |
| `npm install --save-exact --no-audit --no-fund @modelcontextprotocol/client@2.3.1` | Passed; exact direct dependency and lockfile updated, four packages added |
| Four MCP files in the final `npm test` | **105/105 passed**: 48 config/address, 13 socket/DNS/TLS, 31 real-SDK fake HTTP/lifecycle and 13 API cases |
| `npm test` | **286/286 passed in 14 files**; existing 181 regressions plus 105 new cases. All real provider calls forbidden/mocked. Initial focused runs and later TLS/cleanup regressions also passed before the final full rerun |
| `npm run typecheck` | Passed; final image build also rechecked all TypeScript after subsequent changes |
| `npm run lint` | Passed with zero warnings after correcting two unused test parameters; final rerun passed |
| `npm run db:migrate` then `npm run test:db` on the isolated network, with explicit test `DATABASE_URL`/`TEST_DATABASE_URL` | Both existing migrations applied; **12/12 passed**. No new migration or personal DB access |
| `docker build -t open-nook-ai-onk005-review:20261017 .` | Final production build/integrated TypeScript passed. Image `sha256:ce4d57a86ccd13d25fba17009568b1242d3c0a9dc64de0d0f243b85fc209c8a3` |
| Network-disabled `node /image-audit.mjs` in the final image, using `/tmp/open-nook-onk005-check/image-audit.mjs` and read-only synthetic/local env mounts | Passed: no environment files or test dependencies; **103 client JavaScript files** contain no local/test secrets, OpenRouter provider code or MCP endpoint |
| Full Chromium command below | **44/44 passed**, desktop/light 1280×900 and mobile/dark 360×800: 36 previous chat/history/rendering cases plus 8 integration cases, before the final metadata-per-page correction |
| Same wrapper with `npm run test:browser -- tests/browser/integrations.spec.ts --output=/checks/browser-results-final` on the final image | **8/8 passed** after the correction, including both real-route/SDK/fake-MCP journeys. The unrelated 36 chat/history/rendering cases were not repeated for this MCP-only correction |
| Chromium `node /checks/small-screen.mjs`, mounted from `/tmp/open-nook-onk005-check` | **320×800 dark**: keyboard opens panel; panel fits viewport, no document overflow, page errors, external requests or mutations |
| Fake-server `/stats` readback after all browser checks | Exactly **6 physical MCP requests**, two explicit initialize/initialized/list sequences; **0 tool calls**. Refresh/reload/status/disable added no remote request |
| Isolated DB fixture cleanup readback | Zero conversations and messages left after browser journeys |

The private `--internal` network was `open-nook-ai-onk005-test`. The `--rm` database container `open-nook-ai-onk005-test-db` used `--tmpfs /var/lib/postgresql`, database `open_nook_test_onk005`, synthetic credentials and no host port. Database test wrappers joined that network explicitly. The `--rm` web container `open-nook-ai-onk005-test-web` ran the final image without a host port, with only the fixtures directory mounted read-only at `/checks` and synthetic settings in `/tmp/open-nook-onk005-check/test.env`.

The web process preloaded the existing guarded OpenRouter fixture and the new guarded `mcp-mock.mjs`. The latter requires explicit `OPENNOOK_TEST_MCP=1`, the fixed fake key/endpoint and a test-named DB. It substitutes the HTTPS socket with an actual loopback HTTP fake server on port 3001; application routes, manager, SDK, HTTP response handling and byte guards stay real. TLS/DNS policy is tested separately with deterministic native-boundary mocks. This is not live Context7/TLS proof. Health probes explicitly unset `NODE_OPTIONS`.

```bash
docker run --rm --name open-nook-ai-onk005-browser \
  --user "$(id -u):$(id -g)" \
  --network container:open-nook-ai-onk005-test-web \
  --mount type=bind,src="$PWD",dst=/app \
  --mount type=bind,src=/home/zsolti-wsl/.cache/ms-playwright,dst=/ms-playwright,readonly \
  --mount type=bind,src=/tmp/open-nook-onk005-check,dst=/checks \
  --workdir /app --env PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  --env E2E_BASE_URL=http://127.0.0.1:3000 --env E2E_PERSISTENCE=1 --env E2E_MCP=1 \
  open-nook-ai-browser-tools npm run test:browser -- --output=/checks/browser-results
```

### Findings, visual evidence and limits

The first focused run passed 97/99. One assertion accidentally matched the word `description` when checking for `script`; it was narrowed to `<script`. The other failure exposed SDK auto-pagination treating an identical repeated page as successful termination. Discovery now walks pages explicitly with cursor-loop and page-count rejection; valid multi-page/session cleanup and malformed/slow/oversized paths pass. Initial lint found two unused fixture parameters; those were corrected. The initial preservation helper also reported a false difference because JSON serialized mount tuples as arrays; normalizing that comparison confirmed every data/container field unchanged. Final review additionally moved semantic metadata validation before following each cursor, so a bad page cannot trigger another page request. A new regression verifies that boundary; the final full unit run passed 286 cases and the image was rebuilt.

The eight integration browser cases cover unconfigured/inert UI, timeout/retry/disable controls, cancellation/late results and actual-route/SDK discovery through the fake server. The latter asserts both exact allowed names, omission of hostile/secret metadata and denied tool names, then reloads, refreshes and disables without another discovery. Actual desktop/mobile captures `test-results/context7-{desktop-light,mobile-dark}.png` were visually inspected. The supplemental 320 px capture is `/tmp/open-nook-onk005-check/context7-320-dark.png`.

CI was extended to preload both guarded fixtures and run all 44 browser cases without real secrets. **Hosted execution of this updated workflow: Not run.** The previously recorded passing Release 0.1 hosted runs cover the earlier committed baseline, not this story.

**Live Context7 discovery, live OpenRouter generation, real TLS/network/provider compatibility, native Windows browser execution and public hosting: Not run.** No paid generation request or real MCP connection was made. ONK-006 is still Planned. No commit/push or personal-stack redeployment was performed. Final Compose parsing with `.env.example` confirmed only `web`/`db`, blank default MCP URL/key and preservation of an explicitly empty tool policy (so the application rejects it instead of silently widening it). Node `js-yaml` parsing confirmed both guarded CI preloads/flags and no billable secret reference. `python3 /tmp/open-nook-onk004-check/audit.py` passed **149 local links**, source notices, dependency pins and candidate secret scans; `git -c core.whitespace=cr-at-eol diff HEAD --check` passed. The staged diff remained empty.

After the final affected-browser run, the fake server again recorded exactly six discovery requests and zero tool calls. `docker stop open-nook-ai-onk005-test-web open-nook-ai-onk005-test-db` and `docker network rm open-nook-ai-onk005-test` removed only this temporary environment and its memory-only test data. A before/after aggregate fingerprint compared **all 5 personal conversations and 14 messages**, original production container IDs/images and persistent-volume mounts; everything was unchanged. Only the two normal OpenNook containers remain; both are healthy and `http://127.0.0.1:33040/api/health` returned HTTP 200 with database connected. Personal-stack redeployment is not part of this implementation. No commit or push was made.
