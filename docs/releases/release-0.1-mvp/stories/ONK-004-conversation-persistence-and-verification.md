# ONK-004: Persistent conversations and release verification

## Status

Planned

## User story

As a user, I want my chat history saved so I can return to earlier conversations and continue where I left off.

## Goal

Complete PostgreSQL/Prisma conversation persistence, verified chat history operations and a documented, reproducible Release 0.1. Keep the single-user app on localhost.

## Dependencies

ONK-001, ONK-002 and ONK-003 implemented with their focused checks recorded.

## Acceptance criteria

- [ ] Implement `Conversation` and `Message` persistence with stable message order, database migrations and safe message metadata.
- [ ] Add API and UI flows to start, list, open, resume and delete saved conversations; preserve data across container restarts.
- [ ] Ensure stop/error/regenerate flows do not claim unfinished assistant messages as completed or duplicate persisted turns.
- [ ] Add deterministic API/database tests and Playwright browser smoke coverage of a full mocked user journey, including history and copy controls.
- [ ] Configure GitHub Actions lint, typecheck, tests and build without API secrets or billable OpenRouter requests.
- [ ] Run and document applicable Docker Compose build/start/restart/health checks; perform any live model smoke only with separate approval and actual results.
- [ ] Reconcile README, architecture, model configuration, roadmap, license/source header boundaries and release verification with real shipped behavior.

## Out of scope

Accounts, public hosting, production authentication, user profiles, MCP tools, custom skills, vision, RAG, complex agents, unapproved paid smoke runs and future release implementation.
