# HTTP contracts — target (not implemented)

Next.js App Router will serve the API through same-origin Route Handlers. Actual stream format and assistant-ui runtime adapter must match the **pinned AI SDK version** chosen during implementation.

| Endpoint | Purpose | Story |
| --- | --- | --- |
| `GET /api/health` | Local readiness without secrets | ONK-001 |
| `GET /api/models` | Sanitized configured OpenRouter model list | ONK-002 |
| `POST /api/chat` | Start streaming from one allowlisted model | ONK-002 |
| `GET /api/conversations` | List saved conversations | ONK-004 |
| `POST /api/conversations` | Create conversation | ONK-004 |
| `GET /api/conversations/{id}` | Read messages ordered by creation/sequence | ONK-004 |
| `DELETE /api/conversations/{id}` | Delete conversation and its messages | ONK-004 |

The route names are planning contracts and can be adjusted in the active story if a compatible adapter requires it, with the documentation updated at the same time. No MCP or Skills endpoints are part of the MVP.

## Example non-secret model list

```json
{
  "models": [
    { "id": "provider/model-id", "label": "Configured model" }
  ]
}
```

This is a shape example, not proof that `provider/model-id` exists on OpenRouter. Blank model slots are filtered out and duplicates removed; no API key or sensitive provider metadata is returned.

## Chat request concept

```json
{
  "model": "provider/model-id",
  "conversationId": "opaque-id",
  "message": "Explain this code snippet"
}
```

- `conversationId` may be omitted for a new chat; the contract is finalized when persistence is implemented.
- The backend validates request size, model allowlist, server-side secrets, conversation access and timeouts.
- The response is a **stream** following the pinned AI SDK + assistant-ui protocol, not a static JSON object.
- Do not return authorization headers, provider keys or internal stack traces.

## Error cases

Test missing/unknown model, no API key, invalid conversation identifier, oversized content, provider timeout, network error, stream cancellation and database failure. Keep user-visible messages concise while logging only safe operational context. All app-changing routes remain localhost-only until authentication is added in a separately approved future release.
