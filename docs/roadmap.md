# Roadmap

## Release 0.1 — AI Chat MVP

**In progress.** This is the only release with defined story files and acceptance criteria.

| Story | Scope | Status |
| --- | --- | --- |
| [ONK-001](releases/release-0.1-mvp/stories/ONK-001-nextjs-foundation-and-database.md) | Next.js foundation, config, Prisma/PostgreSQL, Docker | Implemented |
| [ONK-002](releases/release-0.1-mvp/stories/ONK-002-openrouter-streaming-model-selection.md) | OpenRouter model allowlist and streaming API | Implemented |
| [ONK-003](releases/release-0.1-mvp/stories/ONK-003-assistant-ui-rich-rendering.md) | assistant-ui chat, controls and safe rich rendering | Planned |
| [ONK-004](releases/release-0.1-mvp/stories/ONK-004-conversation-persistence-and-verification.md) | Conversation management, browser/CI/Compose verification and docs | Planned |

[Release README](releases/release-0.1-mvp/README.md) · [Verification](releases/release-0.1-mvp/verification.md)

## Candidate Release 0.2 — MCP Tool Integration (not committed)

Possible scope after the chat is stable:

- `ONK-005` — MCP Client Integration: one trusted read-only connection and selected tool discovery.
- `ONK-006` — Tool Permissions & Execution: bounded tool calling and backend authorization.

These are **working titles only**. No story files, acceptance criteria, dependency commitments or approval exist yet.

## Candidate Release 0.3 — Custom Skills (not committed)

Possible scope after an MCP integration is demonstrated:

- `ONK-007` — Skill Management: create/edit user-facing skill instructions.
- `ONK-008` — Skill Activation & Tool Binding: manual skill selection plus allowed-tool mapping.

Again, these are **working titles only**. Decide the precise features and security boundaries after Release 0.2 evidence. The application's runtime skills are **not** the repository's Codex `.agents/skills/` files.

## Other future ideas

Multimodal vision, model comparison, public multi-user hosting, OAuth integrations and automatic skill suggestions are ideas only; see [future.md](future.md). Do not add new releases or implement anything from this page without the user's explicit request.
