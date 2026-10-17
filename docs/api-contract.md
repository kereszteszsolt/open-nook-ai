# HTTP contracts — local API and target MVP

Next.js App Router serves same-origin Route Handlers. ONK-001 implements health; ONK-002 implements the model registry and streaming chat API. Conversation routes remain planned for ONK-004. ONK-003 connects the browser through the compatible assistant-ui runtime; conversation history remains in memory until ONK-004.

| Endpoint | Purpose | Story / state |
| --- | --- | --- |
| `GET /api/health` | No-store `200` after a PostgreSQL probe; generic `503` on failure | ONK-001 / implemented |
| `GET /api/models` | Safe configured OpenRouter model list and setup state | ONK-002 / implemented |
| `POST /api/chat` | Stream from one allowlisted model | ONK-002 / implemented |
| `GET /api/conversations` | List saved conversations | ONK-004 / planned |
| `POST /api/conversations` | Create conversation | ONK-004 / planned |
| `GET /api/conversations/{id}` | Read ordered messages | ONK-004 / planned |
| `DELETE /api/conversations/{id}` | Delete conversation and its messages | ONK-004 / planned |

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
  "messages": [
    { "id": "user-1", "role": "user", "parts": [{ "type": "text", "text": "Explain this code snippet" }] }
  ]
}
```

This text-only UI-message shape supports the pinned AI SDK 7 transport. Optional bounded `id`, `trigger` (`submit-message` / `regenerate-message`) and `messageId` fields are transport identifiers; they are not stored or forwarded to OpenRouter. Text parts may include `state: "streaming" | "done"`. All other fields are rejected. There is no `conversationId` support or database persistence yet; the caller supplies bounded prior text context.

- Maximum UTF-8 body: **64 KiB**, enforced while reading even without a truthful `Content-Length`.
- Between **1 and 32** messages, each with a unique 1–128 character ID, role `user` or `assistant`, and **1–8 text parts**. The first and last messages must be from the user.
- Nonblank combined text per message: at most **8,000 UTF-16 code units**; entire context: **24,000**. System prompts, files, tools and client-supplied generation/provider options are rejected.
- Model ID must exactly match the server registry. The total deadline includes upload, provider connection and streaming; see [configuration](model-configuration.md).

After validation, the response uses the [AI SDK UI-message SSE protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol), with `Content-Type: text/event-stream`, `x-vercel-ai-ui-message-stream: v1`, `Cache-Control: no-store` and `X-Accel-Buffering: no`. It forwards text and lifecycle events only, with local message/text IDs. Reasoning, sources, tools, credentials, provider headers and metadata are omitted. A successful answer ends with a `finish` event; `[DONE]` terminates the transport and alone does not mean success.

Provider failures after the stream opens produce a generic `error` event, potentially alongside a `finish` whose `finishReason` is `error`. Missing/unsupported completion reasons, deadline and output-limit stops produce `error` + `abort` without a successful `finish`; cancellation aborts generation. Partial output is not a completed or saved answer. Disconnecting/cancelling the HTTP response aborts the upstream request. There are no automatic retries or model fallbacks.

Provider bytes are capped at **2 MiB** before parsing. Forwarded event JSON payloads are capped at **512 KiB**, plus bounded terminal events and SSE framing. The provider output-token limit is also server-controlled. These are request limits, not account-level spending controls.

## Errors before streaming

```json
{ "error": { "code": "model_not_allowed", "message": "Select a configured model." } }
```

| HTTP status | Code / meaning |
| --- | --- |
| `400` | `invalid_request` or `model_not_allowed` |
| `413` | `request_too_large` |
| `415` | `unsupported_content_type` |
| `408` | `request_timeout` while reading input |
| `499` | `request_cancelled` before streaming |
| `503` | `ai_not_configured` or `invalid_configuration` |
| `502` | `provider_unavailable` for synchronous setup failure |

Errors are uncached and omit raw inputs, authorization headers, provider responses and stack traces. Provider HTTP errors are reported inside the already-open SSE response, not as a new HTTP status. All routes remain localhost-only until separately approved authentication and cost controls exist. No MCP or Skills endpoints are part of this release.
