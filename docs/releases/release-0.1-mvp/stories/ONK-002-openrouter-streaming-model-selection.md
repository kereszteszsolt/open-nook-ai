# ONK-002: OpenRouter streaming and configured models

## Status

Planned

## User story

As a user, I want to select a configured AI model so I can ask it questions and receive streamed answers.

## Goal

Add a server-only OpenRouter provider using a compatible Vercel AI SDK setup, an explicit five-slot model registry and a tested streaming chat API. The final rich UI and persistent history come in later stories.

## Dependencies

ONK-001 implemented and verified.

## Acceptance criteria

- [ ] Load `OPENROUTER_MODEL_1..5`, trim values, hide blanks, deduplicate IDs and cap selectable models at five.
- [ ] `GET /api/models` exposes only safe configured IDs/labels, and models are disabled when `OPENROUTER_API_KEY` is missing.
- [ ] `POST /api/chat` validates model selection and bounded input with Zod; reject unknown IDs and oversized requests.
- [ ] Use a pinned AI SDK/OpenRouter integration to stream replies server-side without exposing provider credentials or automatic model fallback.
- [ ] Handle provider timeout, cancellation and error states without leaking secrets or automatically making costly retries.
- [ ] Add deterministic mock tests for configuration, allowed/denied models, stream success/failure and cancellation; CI makes no real billable calls.
- [ ] Record actual tests and mark live-provider connectivity **Not run** unless it is separately approved and observed.

## Out of scope

Assistant-ui visual polish, rich rendering, Prisma conversation CRUD, all-model discovery, MCP, tool calling, agent frameworks, multi-provider routing or automatic paid fallback.
