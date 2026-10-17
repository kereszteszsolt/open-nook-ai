# HTTP contracts — local API

Next.js App Router serves uncached, same-origin health, models, chat, saved-conversation and integration routes. Mutations reject an explicitly different Origin; this is not authentication.

| Endpoint | Purpose | Story / state |
| --- | --- | --- |
| `GET /api/health` | No-store `200` after a PostgreSQL probe; generic `503` on failure | ONK-001 / implemented |
| `GET /api/models` | Safe configured OpenRouter model list and setup state | ONK-002 / implemented |
| `POST /api/chat` | Stream from one allowlisted model | ONK-002 / implemented |
| `GET /api/conversations` | List saved conversations | ONK-004 / implemented |
| `POST /api/conversations` | Create conversation | ONK-004 / implemented |
| `GET /api/conversations/{id}` | Read ordered messages | ONK-004 / implemented |
| `DELETE /api/conversations/{id}` | Delete conversation and its messages | ONK-004 / implemented |
| `GET /api/integrations/context7` | Local cached discovery state; no remote connection | ONK-005 / implemented |
| `POST /api/integrations/context7` | Explicit enable/discover or disable; no tool execution | ONK-005 / implemented |

Integration requests accept only `{"action":"enable"}` or `{"action":"disable"}`, with a 256-byte JSON body and existing same-origin checks. The server owns endpoint, credentials and allowed tool names. Unconfigured/unavailable/invalid setup returns HTTP 503 with a safe snapshot. See [MCP configuration](mcp-configuration.md) for response fields, states and bounds. Chat request/context contracts below are unchanged; no MCP instruction or tool schema is sent to the model by ONK-005.

## Model registry

```json
{
  "enabled": true,
  "status": "ready",
  "models": [{ "id": "provider/model-id", "label": "provider/model-id" }]
}
```

The example ID is a placeholder, not a verified OpenRouter model. Labels are the configured IDs; blank slots and duplicates are removed. A missing key or empty registry returns `200`, `enabled: false`, an empty `models` array and `status: "missing_api_key"` or `"missing_models"`. Invalid server settings return the same disabled shape with `503` and `"invalid_configuration"`. Responses are uncached and never contain a key or provider metadata.

## Streaming request

Send `Content-Type: application/json`:

```json
{
  "model": "provider/model-id",
  "conversationId": "00000000-0000-4000-8000-000000000001",
  "version": 0,
  "requestId": "00000000-0000-4000-8000-000000000002",
  "messages": [
    { "id": "user-1", "role": "user", "parts": [{ "type": "text", "text": "Explain this code snippet" }] }
  ]
}
```

This text-only shape supports the pinned AI SDK 7 transport. `conversationId` and `requestId` are UUIDs; `version` is the last saved nonnegative integer version. Each attempt uses a new request ID. Optional bounded `id`, `trigger` (`submit-message` / `regenerate-message`) and `messageId` are transport fields, never forwarded to OpenRouter. Text parts may include `state: "streaming" | "done"`. Unknown fields are rejected. The server loads prior completed context from PostgreSQL; clients cannot inject earlier assistant replies.

- Maximum UTF-8 body: **64 KiB**, enforced while reading even without a truthful `Content-Length`.
- Exactly **one user message**, with a unique 1–128 character ID and **1–8 text parts**. Regenerate repeats the latest saved user's original ID/text and replaces the latest assistant row.

- Nonblank combined text per message: at most **8,000 UTF-16 code units**; entire context: **24,000**, including the server-owned formatting guide (which also counts as one context message). Client-supplied system prompts, files, tools and generation/provider options are rejected. The fixed server guide is sent to the provider but is not stored as a conversation message; see [formatting guidance](rendering.md#model-formatting-guidance).
- Model ID must exactly match the server registry. The total deadline includes upload, provider connection and streaming; see [configuration](model-configuration.md).

After validation, the response uses the [AI SDK UI-message SSE protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol), with `Content-Type: text/event-stream`, `x-vercel-ai-ui-message-stream: v1`, `Cache-Control: no-store` and `X-Accel-Buffering: no`. It forwards text and lifecycle events only, with local message/text IDs. Reasoning, sources, tools, credentials, provider headers and raw metadata are omitted. Start/finish events carry server-owned `messageMetadata`: conversation ID, version and pending/completed status. A successful answer ends with a `finish` event only after its database commit; `[DONE]` terminates the transport and alone does not mean success.

Provider failures after the stream opens produce a generic `error` event without successful completion. Missing/unsupported completion reasons, deadline and output-limit stops produce `error` + `abort` without a successful `finish`; cancellation aborts generation. Partial output is saved as stopped/failed, never completed. A failed final save produces a generic save error; the UI keeps visible text and offers history synchronization. Disconnecting/cancelling the HTTP response aborts the upstream request. There are no automatic retries or model fallbacks.

Provider bytes are capped at **2 MiB** before parsing. Forwarded event JSON payloads are capped at **512 KiB**, plus bounded terminal events and SSE framing. The provider output-token limit is also server-controlled. These are request limits, not account-level spending controls.

## Errors before streaming

```json
{ "error": { "code": "model_not_allowed", "message": "Select a configured model." } }
```

| HTTP status | Code / meaning |
| --- | --- |
| `400` | `invalid_request` or `model_not_allowed` |
| `413` | `request_too_large` or `conversation_limit` |
| `415` | `unsupported_content_type` |
| `408` | `request_timeout` while reading input |
| `499` | `request_cancelled` before streaming |
| `403` | `invalid_origin` |
| `404` | `conversation_not_found` |
| `409` | `conversation_changed`; refresh history before retrying |
| `503` | `ai_not_configured`, `invalid_configuration` or `storage_unavailable` |

Errors are uncached and omit raw inputs, authorization headers, provider responses and stack traces. Provider HTTP errors are reported inside the already-open SSE response, not as a new HTTP status. All routes remain localhost-only until separately approved authentication and cost controls exist. No MCP or Skills endpoints are part of this release.

## Saved conversations

- `POST /api/conversations`: strict empty JSON object `{}`, maximum 2 KiB and three-second body deadline. Returns `201` with summary `{id,title,version,active,createdAt,updatedAt}`. Creates no provider request. The UI creates a row lazily on first Send.
- `GET /api/conversations?cursor=<uuid>`: `{conversations: [...summaries], nextCursor: uuid|null}`, at most 20 entries ordered by updatedAt descending, then UUID descending. The cursor is the last visible ID. Concurrent edits can change ordering; refreshing starts a fresh page.
- `GET /api/conversations/{id}`: summary plus `messages`, at most 32 rows in ascending `sequence`. Each row has `{id,sequence,role,content,status,modelId,finishReason}`. Status is `pending`, `completed`, `stopped` or `failed`. Internal request IDs, leases and raw metadata are omitted.
- `DELETE /api/conversations/{id}?version=<integer>`: `204` after cascading deletion; stale version or active generation returns `409`, missing chat `404`. The UI asks before deleting.

The UI remembers the selected UUID in `?conversation=...`, reloads from the database, and keeps history available when models are disabled. A removed model remains visible only as saved metadata; new generation always requires an explicitly selected currently configured model. No automatic regeneration occurs on load or error.
