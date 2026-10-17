# Codex engineering guide

## Current repository status

**OpenNook AI Release 0.1 (ONK-001–004) is implemented for local use.** The committed Release 0.1 baseline has a verified passing hosted CI run; live-provider connectivity remains unverified. Consult release verification for historical and current working-tree checks. **ONK-005 adds locally verified Context7 discovery; ONK-006 and Releases 0.3–0.4 remain Planned.** Discovery uses explicit server configuration and user enablement, without model tool execution. Consult Release 0.2 verification; live Context7 and the updated hosted workflow are not verified.

The delivered MVP is **one Next.js full-stack application** with React, assistant-ui, Vercel AI SDK, five configurable OpenRouter model slots, PostgreSQL/Prisma history and safe rich content rendering. Docker Compose runs `web` and `db`. Do not introduce an independent backend, Nx/Turborepo or MongoDB. ONK-005 MCP discovery is implemented; model tool execution, runtime Skills and quizzes remain separately approved future scopes.

## Minimal context and skill loading

1. Start with this file and the **one active, user-approved `ONK-*` story**. Read its release README and [workflow](docs/story-workflow.md) only when needed for status or approval gates.
2. Inspect affected files and their focused tests. Open architecture, API, data model, chat or security documents **only when relevant** to the story; do not preload the whole repository.
3. Load `.agents/skills/nextjs-ai-chat/SKILL.md` for Next.js/React, AI SDK, assistant-ui, Prisma, rich rendering, quizzes or deployment. Load `.agents/skills/mcp-tool-integration/SKILL.md` **only if an approved ONK-005–008 story changes MCP/tool execution or user-authored runtime skills**.
4. Skills describe **technology-specific engineering practice**, not user stories, business prompts, project roadmap or duplicated acceptance criteria. Those belong to docs and application source.

## Technical boundaries

- **Web + server:** use one Next.js App Router app. Keep UI components focused; isolate Route Handlers, input validation, provider calls, persistence and rendering. No direct OpenRouter calls or API keys from the browser.
- **Providers:** present only explicitly configured and deduplicated `OPENROUTER_MODEL_1..5` IDs. Validate the selected model server-side; never accept arbitrary client IDs, silently switch models or call a charged provider from tests.
- **Streaming:** bound input/context/output sizes, timeouts and retries. Support cancellation. Make error states clear; never claim a message was persisted or completed before it was.
- **Database:** Prisma + PostgreSQL in the self-hosted stack. Persist conversation/message data and minimal model metadata; do not store plaintext keys or make hidden external network calls from model-generated content.
- **Rendering:** treat AI content and diagram specifications as untrusted input. Render Markdown safely without raw HTML/script execution; constrain Mermaid and Vega-Lite, disable unsafe KaTeX trust/external resources, and test hostile content.
- **Security:** Release 0.1 is single-user, localhost-only. Do **not** recommend public hosting before auth, isolation, request limits, cost controls and secure secrets management exist. Never commit `.env`.
- **MCP / runtime skills (discovery implemented; ONK-006–008 planned):** no arbitrary MCP URLs, unrestricted requests, executable skill files or model-granted permissions. A runtime skill is *user guidance*, not a Codex developer skill; the backend enforces tool allowlists and approval for writes. No release planning grants execution authority.
- **Quizzes / clarifications (0.4 planned):** graded practice quizzes use server-side deterministic single/multi-choice matching and private answer keys. Model-generated clarification questions are **ungraded**, never authorize tool calls, and only resume chat after explicit user input.
- **Brand metadata:** use [`public/brand/branding.json`](public/brand/branding.json) for displayed identity and optional assets under `public/brand/assets/`. Keep source SPDX, full `LICENSE`, legal README text, API secrets and versioning **independent** of brand settings.
- **Deployment:** one `web` and one persistent `db` Docker service. OpenRouter is an external HTTPS API; no Ollama or Langfuse service is part of this design.

## Agents and approvals

- **Main Codex session is the default worker.** Do not spawn another agent for routine stories.
- `.codex/agents/implementation-worker.toml` is **optional** and may be delegated one approved story as the **sole code writer**. Never edit the same scope in parallel or create a reviewer/architect pipeline for appearance's sake.
- Before changing implementation files, identify the active story, intended files, risks and focused checks; **request implementation approval**.
- Implement only that story's acceptance criteria, in order. Ask before widening scope, executing billable OpenRouter tests or taking destructive actions.
- Run affected tests first; expand to browser/Compose smoke checks only when warranted. Record **actual** commands and outcomes, or `Not run`, in the release `verification.md`.
- Review the diff, suggest a commit message and request **separate commit approval** before committing/pushing or beginning the next story. Never push or force-update remote history without approval.

## Short Apache-2.0 source notices

For **new hand-written application source files**, use only this short **two-line SPDX notice**, with native syntax:

```text
SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
SPDX-License-Identifier: Apache-2.0
```

Examples: `//` for TypeScript/TSX/JavaScript, `/* ... */` for CSS, `<!-- ... -->` for handwritten HTML and `#` for handwritten shell scripts. Do **not** paste the full license into individual source files. The complete text belongs in `LICENSE`.

**Do not add SPDX headers to:** generic or generated configuration (`next.config.*`, `tsconfig*.json`, `eslint.config.*`, `postcss.config.*`, `prisma/schema.prisma`, `package.json`, `.env*`, `.editorconfig`, `.gitignore`), `Dockerfile`, Compose/YAML, TOML, JSON, Markdown, lockfiles, generated migrations, generated app/template files or binary assets. If a generated file becomes custom-maintained application source, consider an appropriate short header only where it is supported and warranted; preserve third-party notices and generator constraints.

Comments/docstrings explain **why**, not obvious code behavior. Prefer focused tests and short explanations over dense boilerplate comments.

## Scope and evidence

The Release 0.1 stories are implemented with existing evidence. ONK-005 has its own local discovery evidence. ONK-006–011 remain **planned** acceptance criteria for Releases 0.2–0.4; they are **not authorization to implement those stories**. `docs/future.md` contains unscheduled ideas only. Keep implementation within a separately approved story; don't invent results or create new agents without need.
