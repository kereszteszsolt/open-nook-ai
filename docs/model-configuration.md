# OpenRouter configuration — planned MVP

Model selection is intentionally **explicit, bounded and server-controlled**. There is no general model search or provider catalogue fetch in Release 0.1.

## Variables

| Setting | Meaning |
| --- | --- |
| `OPENROUTER_API_KEY` | Server-side secret; blank means no LLM requests |
| `OPENROUTER_MODEL_1` ... `_5` | Up to five user-supplied qualified model IDs |
| `DATABASE_URL` | Prisma PostgreSQL connection URL, never exposed to the browser |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Local Compose database settings |
| `APP_PORT` | Local web host port (default intended `3000`) |
| `AI_REQUEST_TIMEOUT_MS`, `AI_MAX_OUTPUT_TOKENS` | Bounded provider calls; exact mappings to be implemented |

## Selection rules

1. Trim whitespace, ignore blank slots and deduplicate IDs.
2. The UI lists only the resulting five-or-fewer configured models, never arbitrary IDs from user requests.
3. The server rejects requests for unknown model IDs even if the browser has been manipulated.
4. If the API key or model choices are missing, explain setup rather than sending an accidental request.
5. Do not silently route to another provider or model after an error. Real requests may incur OpenRouter charges.

The initial selection can include Qwen, Llama and Mistral models if they are currently available and suitable. **Do not assume that an example ID, price, context window or feature support is permanent**; verify actual provider model identifiers before configuring them.

## Deployment paths

The `.env.example` database URL uses the hostname `db` for **inside the Compose network**. Native `next dev` outside Docker may require a separate `localhost` database URL. ONK-001 must document both and avoid accidentally publishing credentials.

Use `.env` for local secrets, ignored by Git. Never put a key in variables prefixed `NEXT_PUBLIC_`, client components, logging output or a committed config file. A public deployment needs server-side auth, access control, rate limits, budget safeguards and provider data-policy review.

## Provider test boundaries

Mock requests in CI. Real streaming and model-compatibility smoke tests require an API key, explicit approval and a note in the verification record about model ID, observed behavior and approximate cost if known. Do not infer a successful live provider test from a mocked success.
