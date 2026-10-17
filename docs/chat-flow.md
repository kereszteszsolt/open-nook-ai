# Chat and rich rendering — Release 0.1 target

**Status: Chat and rich rendering implemented (ONK-003); persistence planned (ONK-004).** The UI connects to the ONK-002 model registry and text streaming API. Provider verification uses mocks; see the [API contract](api-contract.md) and [supported rich content](rendering.md).

## Basic chat

1. The browser requests the list of configured model IDs; an empty list displays actionable setup guidance.
2. The user selects a configured model and starts an in-memory chat; New chat clears the current thread.
3. The UI sends bounded text context and transport identifiers to the server. The server validates the selected model against its allowlist.
4. OpenRouter returns a stream; the UI renders incremental text with Stop/Retry and safe error handling.
5. Messages remain available in the current tab, including valid partial/error turns. Reload clears them. Persisting finalized turns and revisiting/deleting saved conversations belongs to ONK-004.

Use a stable message ordering scheme and explicit statuses for pending, streaming, completed, cancelled and failed turns. Preserve all valid user data after a failed or interrupted provider call; do not create duplicate assistant messages on retries.

## Rendered content

| Content | MVP behavior | Safety boundary |
| --- | --- | --- |
| Markdown + GFM | Headings, tables, lists, links | Sanitize or disable raw HTML; no untrusted scripts |
| Code | Syntax-highlighted blocks + Copy | Render as text; do not execute |
| Math | KaTeX inline/display formulas | `trust: false`, no arbitrary external content |
| Diagrams | Mermaid preview when complete | Strict security mode, sanitized/limited content, disable unsafe links |
| Charts | Supported Vega-Lite specifications | Validate schema/limits and disallow model-driven URL/data fetching |

Streaming Markdown may be incomplete before generation finishes; fall back to safe text while a diagram or code fence is partial. Provide understandable errors for invalid Mermaid or Vega-Lite data rather than breaking the whole conversation.

## Controls

**Available now:** New chat, select configured model, Send, Stop, Regenerate, Copy message and Copy code block. Opening/deleting saved conversations remains ONK-004. Responsive layout and keyboard navigation are required; avoid rebuilding capabilities assistant-ui already provides.

**Not MVP:** image uploads, multimodal tool execution, model-to-model comparison, MCP integrations, skills or cross-user collaboration.
