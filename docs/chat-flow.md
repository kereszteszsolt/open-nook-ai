# Chat and rich rendering — Release 0.1

Chat, safe rich rendering and persistent history are implemented across ONK-003/004. Provider verification uses mocks; see the [API contract](api-contract.md) and [supported rich content](rendering.md).

## Basic chat

1. The browser requests the list of configured model IDs; an empty list displays actionable setup guidance.
2. New chat opens an empty view. First Send creates a saved conversation, then sends its UUID/version and the latest user prompt.
3. The server validates the selected model, locks the version and saves the user/pending answer. It loads completed context from PostgreSQL before contacting OpenRouter.
4. The UI renders streamed text. “Saving…” remains until the authoritative history is synchronized; only a committed answer receives completed status. Stop/error retain partial text with an explicit unfinished status.
5. History lists recent chats, opens ordered messages, resumes the selected chat after reload and deletes a chat after confirmation. New chat preserves earlier conversations. Regenerate replaces the latest answer without duplicating the user turn.


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

**Available now:** New chat, select configured model, Send, Stop, Regenerate, Copy message and Copy code block. Saved history, reopening, continuation and deletion are also available. Responsive layout and keyboard navigation are required; avoid rebuilding capabilities assistant-ui already provides.

**Not MVP:** image uploads, multimodal tool execution, model-to-model comparison, MCP integrations, skills or cross-user collaboration.
