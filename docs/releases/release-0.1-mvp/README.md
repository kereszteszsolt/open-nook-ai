# Release 0.1 — AI Chat MVP

## Status

**Implemented locally — ONK-001–004.** The single Next.js app includes server-only OpenRouter streaming, assistant-ui chat, safe rich rendering and PostgreSQL conversation CRUD/history. Local mock/API/database/browser/Compose checks passed; GitHub Actions is configured but a hosted run and live OpenRouter connectivity are **Not run**. No publication or push is implied. See [verification.md](verification.md) for actual evidence.

## Goal

Build a minimal self-hosted Next.js chat application with assistant-ui, AI SDK streaming, five configurable OpenRouter models, safely rendered rich responses and persistent PostgreSQL conversation history.

## Boundaries

- One Next.js project serving both browser UI and backend Route Handlers; no separate frontend/server monorepo.
- OpenRouter is the only generation provider. Configuration is server-side; users choose only configured model IDs.
- PostgreSQL/Prisma for conversation persistence, one local web app and one database container with persistent data.
- Markdown/GFM, code copying, KaTeX, Mermaid and Vega-Lite with safe rendering controls.
- Unit/API, browser and Compose checks, then minimal GitHub Actions. Live OpenRouter calls are **opt-in**.
- **No MCP clients, tool calling, runtime skills, auth/public hosting, RAG, model comparison or vision** in this release.

## Story order

| Story | Goal | Status |
| --- | --- | --- |
| [ONK-001](stories/ONK-001-nextjs-foundation-and-database.md) | App, DB and Docker foundation | Implemented |
| [ONK-002](stories/ONK-002-openrouter-streaming-model-selection.md) | Server-side model allowlist and streaming | Implemented |
| [ONK-003](stories/ONK-003-assistant-ui-rich-rendering.md) | Chat UI, safe Markdown/math/diagrams/charts | Implemented |
| [ONK-004](stories/ONK-004-conversation-persistence-and-verification.md) | History, tests, CI, runtime proof and docs | Implemented |

Record **observed outcomes**, not expected results, in [verification.md](verification.md). Implement only after explicit approval; approving one story does not approve the next or authorize a commit.
