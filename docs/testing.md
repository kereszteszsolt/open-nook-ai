# Verification approach — foundation and planned MVP

ONK-001/002 include Vitest checks for database configuration, health, model allowlisting and the real AI SDK/OpenRouter adapter with mocked fetch; `npm run test`, `npm run lint`, `npm run typecheck` and `npm run build` provide local foundation checks. See [Local development](development.md) and the release [verification](releases/release-0.1-mvp/verification.md) for actual commands and outcomes. There is no CI workflow yet. The table below describes evidence for the full MVP as later approved stories are implemented.

| Layer | Planned verification |
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
