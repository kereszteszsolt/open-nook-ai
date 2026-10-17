# ONK-002: OpenRouter streaming and configured models

## Status

Implemented

## User story

As a user, I want to select a configured AI model so I can ask it questions and receive streamed answers.

## Goal

Add a server-only OpenRouter provider using a compatible Vercel AI SDK setup, an explicit five-slot model registry and a tested streaming chat API. The final rich UI and persistent history come in later stories.

## Dependencies

ONK-001 implemented and verified.

## Acceptance criteria

- [x] Load `OPENROUTER_MODEL_1..5`, trim values, hide blanks, deduplicate IDs and cap selectable models at five.
- [x] `GET /api/models` exposes only safe configured IDs/labels, and models are disabled when `OPENROUTER_API_KEY` is missing.
- [x] `POST /api/chat` validates model selection and bounded input with Zod; reject unknown IDs and oversized requests.
- [x] Use a pinned AI SDK/OpenRouter integration to stream replies server-side without exposing provider credentials or automatic model fallback.
- [x] Handle provider timeout, cancellation and error states without leaking secrets or automatically making costly retries.
- [x] Add deterministic mock tests for configuration, allowed/denied models, stream success/failure and cancellation; CI makes no real billable calls.
- [x] Record actual tests and mark live-provider connectivity **Not run** unless it is separately approved and observed.

## Out of scope

Assistant-ui visual polish, rich rendering, Prisma conversation CRUD, all-model discovery, MCP, tool calling, agent frameworks, multi-provider routing or automatic paid fallback.

## Verification

See the [ONK-002 evidence](../verification.md#onk-002-implementation-verification--2026-10-17): 66 provider/configuration tests plus 13 foundation regressions, lint/typecheck/production builds and a production HTTP smoke with mocked OpenRouter. Live-provider connectivity: **Not run**. Chat UI and persistence remain ONK-003/004.
