# Security boundaries — MVP and later extensions

**Local-use baseline:** The MVP has no authentication. Compose must bind exposed web ports to `127.0.0.1` by default. **Do not publish this configuration on the public internet**. Self-hosted refers to the app/database; chat prompts still travel to OpenRouter.

## Release 0.1 checks

- **Secrets:** API keys only in server-side environment, never in browser bundles, DB metadata, logs or error responses. `.env` is Git-ignored.
- **Model access:** only five-or-fewer allowlisted model IDs. Reject arbitrary models, requests above limits and unexpected prompt sizes.
- **Operational cost:** bounded timeouts/output size and one active request per conversation; no automatic provider fallback or billable tests in CI.
- **Conversation access:** local single-user assumptions are not authorization. Require login and per-user access validation before exposing the app beyond localhost.
- **Untrusted text:** sanitize/disable raw HTML in Markdown; never execute code from model output; constrain Mermaid and Vega-Lite; disable remote fetches by renderer specs, limit payload size and use safe KaTeX settings.
- **Persistence:** only safe finish metadata is recorded, incomplete generations retain an explicit status, version checks prevent conflicting writes and expired leases recover abandoned requests. Prompt/answer text is user content and can itself contain sensitive information.
- **Logs:** application handlers omit raw provider/database errors and chat contents; no chat-content logging is enabled by default.

## Later MCP and custom skill boundaries

These are **design rules, not implemented features**. The backend, not the model or skill text, enforces allowlisted MCP servers and tools, resource access, rate limits and any write approval. Do not accept arbitrary user-entered server URLs with backend network privileges (SSRF risk). Begin with read-only tools and test permission denial. Changes, credential delegation and OAuth flows require new approved stories and threat reviews.

The assistant-ui library and Vercel AI SDK are application dependencies; the optional assistant-cloud service is **not** needed for the self-hosted chat. Verify third-party package versions, notices and security updates during implementation.
