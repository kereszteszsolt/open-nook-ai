# Repository inventory — ONK-001 foundation

The original documentation baseline is extended by the approved ONK-001 local foundation. Release 0.1 is still in development; the current story and [verification](releases/release-0.1-mvp/verification.md) determine what is implemented and tested.

## Included now

- `README.md`, `LICENSE`, `.env.example`, `.gitignore`, `.editorconfig`, `AGENTS.md` and the existing Codex skills/optional worker configuration.
- A pinned Next.js App Router / React / TypeScript project, `package.json`, npm lockfile and `.nvmrc`.
- A responsive placeholder, server-only Prisma connection and `GET /api/health` database readiness route.
- Prisma 7 configuration, a model-free schema and initial migration infrastructure without conversation tables.
- Dockerfile, `.dockerignore`, `compose.yaml` with `web` and persistent `db`, plus an optional native-development database port override.
- Environment validation, focused Vitest tests, lint/typecheck/build commands and [local development instructions](development.md).
- Technical target docs, four release stories, actual verification evidence and the existing Ways to Support image.

## Not implemented

- OpenRouter provider/model routes or streaming, assistant-ui chat, rich renderers, conversation tables/CRUD, Playwright project tests and GitHub Actions.
- MCP runtime, tool permissions, application-user skills, authentication or public hosting.

Generated Prisma Client, Next.js output, local `.env` and installed dependencies are not committed. Read [AGENTS.md](../AGENTS.md) and [Release 0.1](releases/release-0.1-mvp/README.md) before starting another story.
