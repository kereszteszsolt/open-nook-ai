# Chat content rendering — ONK-003

The chat uses assistant-ui primitives with `@ai-sdk/react` and the compatible `@assistant-ui/ai-sdk` runtime. A regular `DefaultChatTransport` sends text-only messages to the ONK-002 API; no cloud storage, frontend tools, attachments, MCP connection or automatic model request is configured. ONK-004 stores conversation text and final statuses in PostgreSQL; loaded answers use the same safe renderers.

## Controls and request limits

Choose one of the configured models, enter a message and use Send (Enter) or insert a line break (Shift+Enter). Stop aborts the active fetch. Regenerate explicitly replaces the most recent answer from the same user prompt. New chat opens an empty thread while keeping earlier conversations in history. Copy message preserves the original text; Copy code copies the fenced source. Clipboard failures leave the text selectable.

Model selection and a second Send are disabled during a request. Errors preserve existing messages and expose only generic guidance. The client validates the same message/context/body limits before sending; it never silently truncates conversation context or selects a fallback model. See [HTTP contracts](api-contract.md) for server-enforced limits.

## Markdown, code and math

- `react-markdown` + GFM, with raw HTML skipped. Images are displayed as an omission label, never fetched. Links require an explicit HTTP(S) or mailto scheme, open only on a user click and omit the referrer/opener.
- Fixed Prism grammars highlight ordinary markup/CSS/JavaScript, TypeScript, JSON, Python, Bash and SQL as React text/token spans. Unknown languages remain plain text. Highlighting is limited to 12,000 characters per block; code is never executed.
- Remark math uses KaTeX with `trust: false`, `strict: "error"`, `throwOnError: true`, at most 100 macro expansions, `maxSize: 10` and at most 2,000 source characters. Invalid/unsupported math remains readable as source. Fonts and styles are local application assets.
- Rich previews are limited to 32,000 characters per text part; longer messages show a bounded text preview and remain fully available via Copy message. While streaming, code/math/graphic blocks stay inert text. Markdown parser/rendering failures fall back to readable text.

## Mermaid

Use a fenced `mermaid` block. Supported diagram families are flowchart/graph, sequence, class, state (`stateDiagram-v2`) and entity relationships. Diagrams have a 6,000-character, 100-statement and 100-edge budget. Input rejects configuration directives/frontmatter, HTML, click/callback/link/style instructions, image/icon nodes and URL schemes. Mermaid runs only after the response ends, with strict security, root-level `htmlLabels: false` and error rendering suppressed. Generated SVG is sanitized before insertion; no bind/click callbacks run.

## Vega-Lite

Use a fenced `vega-lite` block with a supported inline-data spec:

```json
{
  "mark": "bar",
  "data": { "values": [{ "category": "A", "amount": 3 }, { "category": "B", "amount": 5 }] },
  "encoding": {
    "x": { "field": "category", "type": "nominal" },
    "y": { "field": "amount", "type": "quantitative" }
  }
}
```

Supported marks are `bar`, `line`, `point` and `area`; x/y and optional color use existing fields with quantitative/nominal/ordinal/temporal types and optional titles. Every referenced field must exist in each row, and quantitative values must be finite numbers. Optional chart title, width (160–640) and height (120–400) are bounded. Defaults are 480×260. Data has 1–500 rows, at most 12 fields per row, short scalar strings/numbers/null values and simple safe field names. The whole JSON source is bounded to the rich-preview limit.

The Zod schema rejects unknown properties, including URL/named data, transforms, expressions, parameters, image marks, layers, links, signals and arbitrary config. Vega-Lite compiles the accepted subset. Vega parses expression ASTs and uses `vega-interpreter`, rather than generating JavaScript functions. All loader methods deny access, and the View is finalized after its SVG is produced. The `$schema` identifier, if supplied, must be the fixed v6 URI; it is not fetched.

## Graphics failures and sanitization

At most four graphic previews are attempted per text part. DOMPurify's SVG profile strips scripts, foreign objects, images, links and executable/remote attributes; a further SVG pass removes network-bearing styles/resources. Invalid or oversized generated SVG is rejected. Failed previews show a short status and retain the original fenced source, without breaking surrounding text or the composer.

Tests exercise normal and hostile Markdown/math/SVG/chart/diagram input. Browser tests also render actual library graphics, inspect controls and block external requests. Actual outcomes and any limitations are in [release verification](releases/release-0.1-mvp/verification.md).

Implementation references: [assistant-ui AI SDK runtime](https://www.assistant-ui.com/docs/runtimes/ai-sdk/v7), [react-markdown security](https://github.com/remarkjs/react-markdown#security), [KaTeX options](https://katex.org/docs/options), [Mermaid security level](https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html), [Vega interpreter](https://vega.github.io/vega/usage/interpreter/), [DOMPurify](https://github.com/cure53/DOMPurify).
