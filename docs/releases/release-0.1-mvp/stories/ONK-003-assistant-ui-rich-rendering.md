# ONK-003: Chat UI and safe rich rendering

## Status

Planned

## User story

As a user, I want an easy chat screen so I can read, copy and reuse AI answers with code, formulas and diagrams.

## Goal

Build a small responsive Next.js chat interface around assistant-ui and the compatible AI SDK runtime. Show safely rendered streamed answers with ordinary chat controls.

## Dependencies

ONK-002 implemented and verified; ONK-001 App Router baseline exists.

## Acceptance criteria

- [ ] Integrate an installed compatible assistant-ui runtime with the Next.js/AI SDK streaming API; provide a usable responsive chat screen.
- [ ] Offer configured model selection, Send, Stop, Regenerate, Copy message and Copy code block with accessible loading and error states.
- [ ] Render Markdown and GFM tables/lists and syntax-highlighted code as non-executable content; do not enable unsafe raw HTML.
- [ ] Render KaTeX math with untrusted input settings, Mermaid diagrams in strict/sanitized mode and bounded Vega-Lite charts without arbitrary remote loads.
- [ ] Handle partial stream syntax, malformed diagram/chart data and rendering failures without breaking the conversation UI.
- [ ] Add targeted component/renderer tests for normal and hostile content and browser checks for main chat controls; record actual outcomes.

## Out of scope

Conversation CRUD, model comparison, image uploads, arbitrary file/system access, MCP, custom skills, additional LLM providers, advanced design system work or finished product screenshots without real captures.
