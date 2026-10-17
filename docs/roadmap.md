# Roadmap

## Release 0.1 — AI Chat MVP

**Implemented locally;** existing verification is preserved unchanged. Mocked-provider checks were recorded; live OpenRouter connectivity and hosted CI execution have not been verified.

| Story | Scope | Status |
| --- | --- | --- |
| [ONK-001](releases/release-0.1-mvp/stories/ONK-001-nextjs-foundation-and-database.md) | Next.js foundation, config, Prisma/PostgreSQL, Docker | Implemented |
| [ONK-002](releases/release-0.1-mvp/stories/ONK-002-openrouter-streaming-model-selection.md) | OpenRouter model allowlist and streaming API | Implemented |
| [ONK-003](releases/release-0.1-mvp/stories/ONK-003-assistant-ui-rich-rendering.md) | assistant-ui chat, controls and safe rich rendering | Implemented |
| [ONK-004](releases/release-0.1-mvp/stories/ONK-004-conversation-persistence-and-verification.md) | Conversation management, browser/CI/Compose verification | Implemented |

[Release 0.1](releases/release-0.1-mvp/README.md) · [Verified evidence](releases/release-0.1-mvp/verification.md)

## Release 0.2 — MCP Tool Integration

**Planned, not implemented.**

| Story | Scope |
| --- | --- |
| [ONK-005](releases/release-0.2-mcp-tool-integration/stories/ONK-005-trusted-mcp-connection-and-discovery.md) | Trusted read-only connection, discover and filter tool metadata |
| [ONK-006](releases/release-0.2-mcp-tool-integration/stories/ONK-006-controlled-tool-calling-and-verification.md) | Bounded model tool-calling with backend-enforced permission checks |

[Release 0.2](releases/release-0.2-mcp-tool-integration/README.md) · [Verification (not run)](releases/release-0.2-mcp-tool-integration/verification.md)

## Release 0.3 — Custom Skills

**Planned, not implemented; depends on Release 0.2.** These are **application runtime skills**, not `.agents/skills` used by Codex.

| Story | Scope |
| --- | --- |
| [ONK-007](releases/release-0.3-custom-skills/stories/ONK-007-skill-authoring-and-storage.md) | User-authored text skill CRUD and storage |
| [ONK-008](releases/release-0.3-custom-skills/stories/ONK-008-manual-skill-activation-and-tool-binding.md) | Explicit activation and binding only to authorized tools |

[Release 0.3](releases/release-0.3-custom-skills/README.md) · [Verification (not run)](releases/release-0.3-custom-skills/verification.md)

## Release 0.4 — Interactive Quizzes & Clarifications

**Planned, not implemented.** Practice quizzes **are graded** using server-side option matching; assistant clarification questions **are not graded**. The quiz engine relies on the Release 0.1 chat/persistence foundation, not inherently on MCP/Skills.

| Story | Scope |
| --- | --- |
| [ONK-009](releases/release-0.4-interactive-quizzes/stories/ONK-009-structured-quiz-generation.md) | AI-generated, schema-validated practice quizzes; private answer key |
| [ONK-010](releases/release-0.4-interactive-quizzes/stories/ONK-010-quiz-ui-and-deterministic-scoring.md) | One/many questions, single-page/stepper views and objective scoring |
| [ONK-011](releases/release-0.4-interactive-quizzes/stories/ONK-011-ungraded-chat-clarifications-and-verification.md) | Optional ungraded AI clarification question UI and tested chat continuation |

[Release 0.4](releases/release-0.4-interactive-quizzes/README.md) · [Verification (not run)](releases/release-0.4-interactive-quizzes/verification.md)

## Future ideas

Vision, model comparison, public multi-user hosting, non-MCP APIs and automatic skill suggestions remain **ideas only** in [future.md](future.md).

**Approval boundary:** documentation and story planning are not authorization to implement a release, incur OpenRouter charges or commit changes. Work on one user-approved story at a time.
