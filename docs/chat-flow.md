# Chat and rich rendering — Release 0.1 target

**Status: Planned.** This is user-facing behavior, not a completed feature.

## Basic chat

1. The browser requests the list of configured model IDs; an empty list displays actionable setup guidance.
2. The user selects a model and opens or creates a conversation.
3. The UI sends a bounded text prompt and conversation identifier to the server. The server validates the selected model against its allowlist.
4. OpenRouter returns a stream; the UI renders incremental text with Stop/Retry and safe error handling.
5. The backend persists the finalized turn; the user can revisit previous conversations.

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

**MVP:** New chat, select configured model, Send, Stop, Regenerate, Copy message, Copy code block, open saved conversation, delete conversation. Responsive layout and keyboard navigation are required; avoid rebuilding capabilities assistant-ui already provides.

**Not MVP:** image uploads, multimodal tool execution, model-to-model comparison, MCP integrations, skills or cross-user collaboration.
