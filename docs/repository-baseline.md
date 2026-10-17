# Baseline inventory — planned, not implemented

This snapshot is intentionally **documentation and Codex configuration only**. It has no `package.json`, Next.js source, generated components, Prisma schema, Compose stack or GitHub Actions workflow. Their creation belongs to the active Release 0.1 stories and requires separate user approval.

## Included now

- `README.md`, `LICENSE`, `.env.example`, `.gitignore`, `.editorconfig`, `AGENTS.md`.
- Two focused `.agents/skills/*/SKILL.md` files and one optional `.codex/agents/implementation-worker.toml`.
- Technical architecture, streaming/API contract, data model, model config, safety/testing docs, roadmap and story workflow.
- Four `ONK-*` story files with unchecked acceptance criteria and an empty verification record.
- A copied image for the existing Ways to Support section.

## Intentionally omitted

- App/UI source, `package.json`, lockfiles, Next.js scaffold, Prisma files/migrations, Dockerfile, Compose YAML, runtime `.env`, screenshots, CI workflows.
- OpenRouter secret or model IDs assumed to be available without configuration.
- MCP server connections, tool permissions and application-user Skills implementation.

Read [AGENTS.md](../AGENTS.md) and [Release 0.1](releases/release-0.1-mvp/README.md) before starting. This inventory should be refreshed as the first story introduces actual files.
