---
name: nextjs-ai-chat
description: Use for OpenNook AI Next.js/React, assistant-ui, AI SDK streaming, Zod, Prisma, safe rich/quiz UI, Docker and focused web tests.
---

# Next.js full-stack AI chat engineering

## Load when

An approved story changes React UI, Next.js Route Handlers, AI SDK, assistant-ui adapters, Prisma persistence, model configuration, rich content/quiz rendering, Docker or web tests. Do not load just to plan unrelated future features.

## Technical practices

1. Check the relevant Next.js/React, AI SDK, assistant-ui and Prisma **installed versions** before choosing integration patterns. Avoid experimental RSC `streamUI` APIs; use stable AI SDK Core/UI chat streaming compatible with the selected assistant-ui adapter.
2. Keep browser components distinct from server-only provider and storage code. Keep the OpenRouter key off the client; server-validate selected models and bounded requests with Zod.
3. Treat streaming as an asynchronous state machine: pending, streaming, completed, stopped, failed. Do not duplicate messages or lose a valid conversation after Stop/Regenerate. Persist only intentionally finalized content and test interruption paths.
4. Use Prisma migrations for relational data; keep user-facing conversation operations deterministic and testable. Avoid unnecessary database abstractions and provider-wide model discovery.
5. Sanitize and bound AI-rendered Markdown, code, Mermaid, Vega-Lite and KaTeX. Never execute arbitrary JS or allow model-controlled external URL fetching through rich renderers.
6. Keep UI accessible with clear loading/error/empty states, copy controls and keyboard support. Prefer small reusable React components; do not rebuild assistant-ui internals unnecessarily.
7. For quiz work, distinguish graded practice content from ungraded chat clarification forms. Keep answer keys server-only, validate structured output and grade objective selections deterministically; preserve conversation save/interrupt semantics.
8. User-visible branding comes from `public/brand/branding.json`, with optional local images and no legal-notice rewrites. The local stack stays Next.js `web` + PostgreSQL `db`; use a persistent volume and no unrelated monorepo system.

## Verification

Run focused Vitest/API tests with a mocked provider, then affected Playwright/browser and Docker checks as the active story requires. Never call billable OpenRouter models in CI or as a default test. Record exact commands and limitations in `verification.md`.
