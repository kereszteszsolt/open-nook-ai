# OpenRouter configuration — ONK-002

Model selection is intentionally **explicit, bounded and server-controlled**. There is no general model search or provider catalogue fetch in Release 0.1.

## Variables

| Setting | Meaning |
| --- | --- |
| `OPENROUTER_API_KEY` | Server-side secret; blank means no LLM requests |
| `OPENROUTER_MODEL_1` ... `_5` | Up to five user-supplied qualified model IDs |
| `DATABASE_URL` | Prisma PostgreSQL connection URL, never exposed to the browser |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Local Compose database settings |
| `APP_PORT` | Local web host port (default `3000`) |
| `AI_REQUEST_TIMEOUT_MS` | Total upload/connection/stream deadline, integer `1000..120000`; default `60000` |
| `AI_MAX_OUTPUT_TOKENS` | OpenRouter `max_tokens`, integer `1..8192`; default `2048` |

## Selection rules

1. Trim whitespace, ignore blank slots and deduplicate IDs.
2. `GET /api/models` exposes only the resulting five-or-fewer configured IDs, with the same IDs as labels. The ONK-003 selector offers exactly this list and is disabled while a response is running.
3. The server rejects requests for unknown model IDs even if the browser has been manipulated.
4. If the API key or model choices are missing, explain setup rather than sending an accidental request.
5. Do not silently route to another provider or model after an error. Real requests may incur OpenRouter charges.

IDs must be qualified `provider/model` values, at most 200 characters, using letters, digits, periods, underscores, hyphens, slashes or suffix colons. A sixth environment slot is ignored. The API key is trimmed, limited to 1024 printable non-space ASCII characters and kept server-side. Invalid settings disable the API with a safe error instead of silently choosing defaults.

The integration pins `ai@7.0.143` and `@openrouter/ai-sdk-provider@3.1.0`. It uses the fixed HTTPS chat-completions endpoint, denies redirects, sets `maxRetries: 0` / `streamRetries: 0` and sends `provider.allow_fallbacks: false` with `require_parameters: true`. No alternate model list is sent. Provider-side routing for the selected model remains OpenRouter's responsibility; unsupported required parameters cause an error.

**Do not assume that an example ID, price, context window or feature support is permanent**; verify actual provider model identifiers before configuring them. Explicit `POST /api/chat` requests may incur charges. Loading the chat or listing models does not contact OpenRouter. Request/context/output limits and the SSE contract are documented in [HTTP contracts](api-contract.md).

## Deployment paths

The `.env.example` database URL uses the hostname `db` for **inside the Compose network**. Native `next dev` outside Docker uses `127.0.0.1:5433` with the optional `compose.dev.yaml` database port mapping. See [Local development](development.md) for both workflows. Compose forwards the optional OpenRouter settings and request limits to `web`; no provider setting is required for health or build checks. Restart/recreate `web` after changing its environment.

Use `.env` for local secrets, ignored by Git. Never put a key in variables prefixed `NEXT_PUBLIC_`, client components, logging output or a committed config file. A public deployment needs server-side auth, access control, rate limits, budget safeguards and provider data-policy review.

## Provider test boundaries

Mock requests in CI. Real streaming and model-compatibility smoke tests require an API key, explicit approval and a note in the verification record about model ID, observed behavior and approximate cost if known. Do not infer a successful live provider test from a mocked success.
