# PostgreSQL / Prisma data model

The schema and additive migration are in [prisma/schema.prisma](../prisma/schema.prisma) and [the history migration](../prisma/migrations/20261017090000_conversation_history/migration.sql). The original empty foundation migration remains unchanged.

| Entity | Stored fields and guarantees |
| --- | --- |
| `Conversation` | UUID, title (80 characters), timestamps, integer version, active request UUID and lease expiry |
| `Message` | UUID, conversation FK, stable client ID, sequence, user/assistant role, text, status, optional model ID, request UUID, minimal JSONB finish reason, timestamps |

Message sequence and client ID are each unique within a conversation. Reads order by sequence. Deleting a conversation cascades to its messages. Titles derive from the first prompt; no extra model call is made. There are no user, tool, integration, skill or credential tables.

## Turn lifecycle

1. Compare the expected version and require no active request. In the same transaction increment the version, reserve a request lease, and create a completed user message plus a pending empty assistant row. Only then start the provider.
2. Finish only if the active request UUID still matches. Atomically save text/status, clear the lease and increment the version. A successful stream finish is sent only after this commit.
3. Stop saves `stopped`; provider errors, empty/unsupported completion and interrupted expired leases save `failed`. Pending, stopped and failed assistant messages never enter the next model context. User prompts remain stored.
4. Regenerate accepts only the latest user prompt with its original ID/text and replaces the latest assistant row in place. Replays, stale versions, simultaneous sends/deletes and late callbacks receive a conflict, with no duplicate turn or automatic provider retry.

The application allows 32 stored messages (16 turns) per chat, 8,000 UTF-16 units per context message and 24,000 across context. It rejects excess context rather than silently dropping history. A long saved answer remains viewable; regenerating its latest turn excludes that answer from context. Safe metadata contains only a bounded, allowlisted finish reason; raw provider responses, keys and headers are never persisted as metadata. As with any user content, prompts/answers themselves may contain text the user chooses to send.

## Local persistence

Compose mounts the named `postgres_data` volume at PostgreSQL 18's persistent parent directory. Application and database container restarts/recreation preserve history. Removing a volume is destructive and needs explicit approval. The API is single-user/localhost-only; it provides no authentication or cross-user isolation.

## Planned later entities — not implemented

- **Release 0.2:** initially preconfigured trusted MCP connection; any optional tool execution metadata is non-secret and bounded. No arbitrary user-defined server table is required just to demonstrate one connection.
- **Release 0.3:** `Skill` and conversation/tool-binding relationships in additive Prisma migrations. Never store plaintext access tokens in JSONB.
- **Release 0.4:** `PracticeQuiz`, `QuizQuestion`, `QuizSubmission` (exact schema defined by ONK-009–010) with server-private answer keys. Optional clarification prompts reuse the existing conversation lifecycle or a separately validated additive model.

These entities are **planned**. The current Prisma schema and 0.1 migrations have not been changed by release planning.
