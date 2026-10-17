# Context7 MCP discovery — ONK-005

OpenNook supports one deliberately approved read-only integration: **Context7 documentation**, using Streamable HTTP at `https://mcp.context7.com/mcp`. It discovers tools only. Model tool execution remains the separately planned ONK-006 story.

## Configuration and consent

| Server variable | Meaning |
| --- | --- |
| `MCP_CONTEXT7_URL` | Empty by default, so discovery is unavailable. The only accepted nonempty value is `https://mcp.context7.com/mcp` |
| `MCP_CONTEXT7_API_KEY` | Optional server-only bearer key. Empty uses Context7's anonymous access; availability/rate limits depend on the provider |
| `MCP_CONTEXT7_ALLOWED_TOOLS` | Comma-separated subset of `resolve-library-id,query-docs`; defaults to both. Empty or unknown names invalidate a configured connection |

Set these in ignored `.env`, then recreate `web` to load changed Docker environment settings. No key belongs in `NEXT_PUBLIC_*`, browser settings, chat, brand metadata or committed configuration. `.env.example` contains no credentials. Endpoint, credentials and tool policy cannot be supplied through the browser API.

Open **Integrations** in the chat toolbar and choose **Enable Context7**. Only that explicit action starts discovery. Loading the app, opening the panel, refreshing local status or reloading an enabled page never contacts Context7. Enabling sends protocol initialization and tool-list requests, without chat content, prompts, database records or OpenRouter access. Remote discovery can consume the configured Context7 account's request allowance; enabling does not approve executing tools.

The two preapproved names are `resolve-library-id` (library lookup) and `query-docs` (documentation lookup), as documented by [Context7](https://context7.com/docs/resources/all-clients). Unknown tools are ignored; an empty approved result fails closed. Server-provided read-only annotations cannot authorize additional names, and contradictory write/destructive hints reject an approved tool.

**Tools discovered** means a bounded cached metadata snapshot, with its discovery time. It is not a continuous connectivity probe. **Disable Context7** clears that snapshot and cancels in-flight discovery. State belongs to the single local server process, across tabs; it starts disabled on every server restart. It is not stored in conversation history. No schema migration is needed.

## Transport and limits

The official `@modelcontextprotocol/client@2.3.1` SDK uses the legacy initialization handshake supported by its Streamable HTTP transport. JSON and POST SSE responses are tested. Optional unsolicited GET streams, auto-reconnect, protocol probes, legacy SSE fallback, stdio/child processes, OAuth, sampling, roots, elicitation and tool execution are not enabled. No MCP server instructions are added to model context.

The server requires the exact HTTPS endpoint, verified TLS and public A/AAAA destinations. DNS is validated and pinned in the actual socket lookup, including all returned addresses; private, loopback, link-local, mapped and reserved addresses are rejected. There is no production localhost/private-address override. Fresh requests do not reuse an unchecked pooled socket. Redirects fail without following `Location`; HTTP errors do not retry or launch an authorization flow. Even valid metadata cannot select another server.

Discovery has a **10-second total deadline**, **3 pages**, **32 advertised tools**, **6 physical requests** including optional session release, **8 KiB request bodies/HTTP headers**, **64 KiB per response** and **128 KiB total response bodies**. Cursors are at most 256 printable characters and repeated cursors fail. Requests are single-flight; disable, client cancellation, a changed configuration and late responses cannot restore revoked state. A server session is released after successful discovery when supported; failed/cancelled attempts close locally without a further cleanup request.

Only the two fixed names, locally written descriptions, state and discovery time are returned. Remote descriptions, schemas, instructions, server identity, icons, raw errors and credentials are omitted. No metadata is executed or rendered as HTML/Markdown. Unavailable/timeout/malformed states use safe messages; failures do not affect chat history or enable tool calling.

## API

`GET /api/integrations/context7` returns an uncached local snapshot, without external requests. States are `not_configured`, `invalid_configuration`, `disabled`, `connecting`, `ready` and `unavailable`.

`POST /api/integrations/context7` accepts only `{"action":"enable"}` or `{"action":"disable"}`. It enforces the existing same-origin policy, JSON content type, a 256-byte body limit and a 3-second upload deadline. Accepted state changes return the snapshot; unavailable/unconfigured/invalid setup uses HTTP 503. Bad commands/origins are rejected before discovery. There is no browser tool-call or URL-registration endpoint.

## Evidence boundary

Unit tests use the real SDK with deterministic fake HTTP replies and separately test socket/DNS policy. `tests/fixtures/mcp-mock.mjs` is a guarded test-only HTTPS-to-loopback substitution: it requires a synthetic key, explicit opt-in and an isolated `open_nook_test*` database. Browser journeys then use real app routes, SDK and HTTP processing. The substitution does not prove live TLS, DNS or Context7 compatibility; policy checks and live integration evidence are distinct.

See [Release 0.2 verification](releases/release-0.2-mcp-tool-integration/verification.md) for actual outcomes and the [official client connection guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/clients/connect.md) for SDK context. A live Context7 smoke test requires separate approval. The app remains single-user and localhost-only.
