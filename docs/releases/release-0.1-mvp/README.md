# Release 0.1 — AI Chat MVP

## Status

**In progress — ONK-001 implemented.** Next.js, database readiness, Prisma migration infrastructure and a local Compose stack are available and verified. Chat, live cloud calls, conversation history and CI remain unimplemented. See [verification.md](verification.md) for observed outcomes.

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
| [ONK-002](stories/ONK-002-openrouter-streaming-model-selection.md) | Server-side model allowlist and streaming | Planned |
| [ONK-003](stories/ONK-003-assistant-ui-rich-rendering.md) | Chat UI, safe Markdown/math/diagrams/charts | Planned |
| [ONK-004](stories/ONK-004-conversation-persistence-and-verification.md) | History, tests, CI, runtime proof and docs | Planned |

Record **observed outcomes**, not expected results, in [verification.md](verification.md). Implement only after explicit approval; approving one story does not approve the next or authorize a commit.
