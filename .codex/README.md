# Codex setup — minimal, technology-focused

Use the main Codex session as the default implementer for **one approved story**. There is no automatic multi-agent pipeline.

| Component | Load/use only when |
| --- | --- |
| Optional `implementation_worker` | A single approved story is explicitly delegated; the main session stops editing |
| `nextjs-ai-chat` skill | Next.js App Router, assistant-ui/AI SDK streaming, Prisma, rich rendering, quiz UI and CI |
| `mcp-tool-integration` skill | An **approved ONK-005–008** story touches MCP discovery, authorization, calling or runtime skill bindings |

Start with [AGENTS.md](../AGENTS.md) and the active `ONK-*` story. Inspect relevant files/tests; do not load unrelated stories or both skills by default. Do not run duplicate agents, duplicate browser tests or unapproved billable model requests.

**Two approval gates:** (1) implementation, (2) commit/push. Write actual evidence in the release verification file. The user—not an agent—decides when another story starts.
