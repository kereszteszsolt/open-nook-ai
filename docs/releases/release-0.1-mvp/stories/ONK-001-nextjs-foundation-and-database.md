# ONK-001: Next.js foundation and local database

## Status

Planned

## User story

As a developer, I want one local Next.js application so I can build the chat UI and API without extra services.

## Goal

Create a pinned Next.js/React/TypeScript foundation, Prisma/PostgreSQL configuration, a health route and localhost-only Docker Compose with a persistent database. The app does not yet need to talk to an LLM.

## Dependencies

None. Use the existing documentation-only baseline as the target design.

## Acceptance criteria

- [ ] Create one Next.js App Router project with compatible pinned Node.js, Next.js, React and TypeScript versions; add working development and build commands.
- [ ] Provide a simple responsive placeholder page and `GET /api/health` without a separate backend or monorepo build tool.
- [ ] Define the initial Prisma/PostgreSQL connection and a minimal migration foundation; do not implement conversation CRUD in this story.
- [ ] Create Dockerfile and Compose for only `web` and `db`, with localhost-bound web access, one named persistent database volume and a documented health check.
- [ ] Validate required environment settings and keep real `.env` secrets out of Git, images and client bundles.
- [ ] Add focused baseline checks and document a real local build/Compose validation, or an explicit reason a command was not run.
- [ ] Follow the short source SPDX notice policy; **do not add headers to generated or general config files**.

## Out of scope

OpenRouter integration, streaming, assistant-ui, message history operations, diagram rendering, MCP, runtime skills, authentication or publicly hosted deployment.
