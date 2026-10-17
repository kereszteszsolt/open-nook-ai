# ONK-003: Chat UI and safe rich rendering

## Status

Implemented

## User story

As a user, I want an easy chat screen so I can read, copy and reuse AI answers with code, formulas and diagrams.

## Goal

Build a small responsive Next.js chat interface around assistant-ui and the compatible AI SDK runtime. Show safely rendered streamed answers with ordinary chat controls.

## Dependencies

ONK-002 implemented and verified; ONK-001 App Router baseline exists.

## Acceptance criteria

- [x] Integrate an installed compatible assistant-ui runtime with the Next.js/AI SDK streaming API; provide a usable responsive chat screen.
- [x] Offer configured model selection, Send, Stop, Regenerate, Copy message and Copy code block with accessible loading and error states.
- [x] Render Markdown and GFM tables/lists and syntax-highlighted code as non-executable content; do not enable unsafe raw HTML.
- [x] Render KaTeX math with untrusted input settings, Mermaid diagrams in strict/sanitized mode and bounded Vega-Lite charts without arbitrary remote loads.
- [x] Handle partial stream syntax, malformed diagram/chart data and rendering failures without breaking the conversation UI.
- [x] Add targeted component/renderer tests for normal and hostile content and browser checks for main chat controls; record actual outcomes.

## Out of scope

Conversation CRUD, model comparison, image uploads, arbitrary file/system access, MCP, custom skills, additional LLM providers, advanced design system work or finished product screenshots without real captures.

## Verification

See the [ONK-003 evidence](../verification.md#onk-003-implementation-verification--2026-10-17): 55 new tests plus 79 API/foundation regressions, actual rich-renderer and control checks in Chromium, and a full browser-to-Next.js streaming smoke with a mocked OpenRouter provider. Live-provider connectivity: **Not run**. Conversation storage and CI remain ONK-004.
