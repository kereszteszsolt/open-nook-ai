# OpenNook AI

> **A self-hosted, extensible AI assistant — starting with a simple, capable chat.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-D22128?style=flat-square)](LICENSE)
![Status: MVP in development](https://img.shields.io/badge/status-MVP%20in%20development-64748b?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16.4.2-1A1A1A?style=flat-square)
![OpenRouter](https://img.shields.io/badge/OpenRouter-server%20API-6C5CE7?style=flat-square)

**OpenNook AI** is a planned **self-hosted AI chat application** using Next.js and OpenRouter. Choose one of up to five configured models, stream responses, view Markdown and code, render mathematics and diagrams, and resume saved conversations. Later phases may add **read-only MCP tools** and **custom, explicitly activated skills**.

> **Repository status: ONK-001 foundation and ONK-002 streaming API.** Release 0.1 is **in development**. A Next.js placeholder, database readiness, local Compose stack, safe model registry and server-only OpenRouter streaming API are included. Provider behavior is verified with mocks; live connectivity is not tested. The chat UI, rich rendering and conversation history remain planned. The diagrams describe the target MVP; actual checks are recorded in [release verification](docs/releases/release-0.1-mvp/verification.md).

## Planned Release 0.1 — AI Chat MVP

- **Chat and controls:** create a conversation, send prompts, stream responses, stop generation, retry an answer, copy messages and code blocks.
- **Configurable models:** select from up to **five** explicit OpenRouter model IDs in the server environment. Empty slots are hidden; unknown model IDs are rejected.
- **Rich answers:** Markdown, GitHub-flavored tables/lists, syntax-highlighted source code, KaTeX mathematics, Mermaid diagrams and Vega-Lite charts.
- **Conversation history:** save and continue conversations in PostgreSQL through Prisma; delete a conversation from the local app.
- **One self-hosted stack:** Next.js serves React and backend Route Handlers; Docker Compose runs `web` and `db`. OpenRouter remains an external API.
- **Quality:** deterministic tests, browser smoke tests, CI, explicit empty/error states, and safe rendering of model-generated content.

**Not included in 0.1:** MCP, tools, custom skills, image uploads, accounts, public multi-user hosting, RAG or a separate NestJS API.

## How it is intended to work

1. Run the application locally and configure an OpenRouter API key and at least one supported model.
2. Open the chat, choose a listed model and enter a message.
3. Read the streamed answer, including formatted text, code, equations and supported diagrams; copy anything useful.
4. Start another conversation or revisit an earlier one. Chat history is stored locally in your PostgreSQL instance.

```mermaid
sequenceDiagram
    actor User
    participant UI as Next.js Chat UI
    participant API as Next.js Route Handler
    participant AI as AI SDK
    participant OR as OpenRouter
    participant DB as PostgreSQL / Prisma
    User->>UI: Choose configured model and send message
    UI->>API: POST /api/chat
    API->>API: Validate model, payload and access scope
    API->>DB: Read permitted conversation context
    API->>AI: Start model request
    AI->>OR: Streaming LLM API call
    OR-->>AI: Response stream
    AI-->>UI: Stream response chunks
    UI-->>User: Render safe, incremental content
    API->>DB: Store completed messages and metadata
```

## Planned architecture

```mermaid
flowchart TB
    User[Browser / single local user] --> Web
    subgraph Compose[Self-hosted Docker Compose]
        Web[Next.js + React + assistant-ui]
        Api[Next.js Route Handlers + AI SDK]
        ORM[Prisma]
        DB[(PostgreSQL with persistent volume)]
        Web -->|Same-origin requests| Api
        Api --> ORM --> DB
    end
    Api -->|HTTPS / selected model| OpenRouter[OpenRouter API]
    Future[Future: MCP client, tool permissions, custom skills] -.->|Not implemented in 0.1| Api
```

The OpenRouter API key stays **server-side**. Conversation data stays in the self-hosted database, but **messages sent for generation are shared with the selected cloud provider**. This demo is **single-user and localhost-only** until authentication, access controls, rate limiting and cost safeguards are added.

More: [Architecture](docs/architecture.md) · [Chat flow](docs/chat-flow.md) · [Data model](docs/data-model.md) · [Security](docs/security.md).

## Planned technology stack

| Area | Technology |
| --- | --- |
| Web and server | Next.js (App Router), React, TypeScript |
| Chat UI | assistant-ui, Tailwind CSS; optional shadcn/ui-style primitives |
| LLM integration | Vercel AI SDK (Core/UI), OpenRouter |
| Rich rendering | Markdown + GFM, syntax highlighting, KaTeX, Mermaid, Vega-Lite |
| Storage | PostgreSQL, Prisma; JSONB only where flexible metadata is useful |
| Validation | Zod |
| Testing | Vitest, Playwright; mocked OpenRouter calls in CI |
| Deployment | Docker Compose (`web`, `db`) |
| Delivery | GitHub Actions CI |

The foundation pins Node.js 24.20.0, Next.js 16.4.2, React 19.3.1, TypeScript 5.9.3 and Prisma 7.10.1. ONK-002 pins AI SDK 7.0.143 and the OpenRouter adapter 3.1.0. The assistant-ui runtime will be added in ONK-003. See [Local development](docs/development.md) for the exact foundation stack and commands.

## Model configuration

The model selector is backed by **exactly five optional environment slots**, never by unbounded catalogue browsing:

```dotenv
OPENROUTER_API_KEY=
OPENROUTER_MODEL_1=
OPENROUTER_MODEL_2=
OPENROUTER_MODEL_3=
OPENROUTER_MODEL_4=
OPENROUTER_MODEL_5=
```

Only non-empty, unique, configured IDs are offered. If the key or all slots are missing, the app explains what must be configured. Select currently available, compatible Qwen, Llama or Mistral models yourself; this baseline does not assume specific model names or prices. See [Model configuration](docs/model-configuration.md).

## Local setup — foundation and streaming API

To run the current placeholder, database readiness and model/chat API locally:

```bash
cp .env.example .env
# Replace the PostgreSQL password in POSTGRES_PASSWORD and DATABASE_URL.
docker compose up --build --wait
```

Open `http://localhost:3000`; set `APP_PORT` if that port is occupied. `GET /api/health` reports readiness after a successful database query. OpenRouter settings may remain empty: the chat API is disabled without a key and configured model. Loading the placeholder and listing models make no provider calls. Explicit chat requests may incur charges; see the [API contract](docs/api-contract.md). See [Local development](docs/development.md) for native Next.js setup, migrations and checks.

For a public deployment, **do not reuse this unauthenticated demo configuration**. Add authentication, per-user data isolation, limits and cost protection first.

## Roadmap and development guides

Only **Release 0.1** has committed story acceptance criteria. Future MCP and Skills phases are high-level candidates, not implementation authorizations.

| Document | Purpose |
| --- | --- |
| [Roadmap](docs/roadmap.md) | MVP story order and candidate later phases |
| [Release 0.1](docs/releases/release-0.1-mvp/README.md) | MVP story order and implementation status |
| [Release verification](docs/releases/release-0.1-mvp/verification.md) | Actual commands, observed results and remaining checks |
| [Local development](docs/development.md) | Current foundation versions, Compose and native setup |
| [API contract](docs/api-contract.md) | Implemented models/chat streaming and planned conversation routes |
| [Model configuration](docs/model-configuration.md) | Allowlisted OpenRouter models and secrets |
| [Testing](docs/testing.md) | Test strategy without billable CI calls |
| [MCP and Skills concept](docs/extensions.md) | Clearly **future**, no runtime code in MVP |
| [Future ideas](docs/future.md) | Optional features without acceptance criteria |
| [Codex roles and skills](.codex/README.md) | Lightweight technical agent guidance |
| [Story workflow](docs/story-workflow.md) | Approvals and verification evidence |

Development follows [AGENTS.md](AGENTS.md): work on **one approved story at a time**, load only the relevant technical skill, run focused checks and request separate approval before committing. The main Codex session is the default worker; the configured helper agent is optional and **not** an automatic parallel implementation pipeline.

## License

Apache-2.0. Copyright © 2026 **Keresztes Zsolt** — [kereszteszsolt.hu](https://kereszteszsolt.hu).

New hand-written application source files use the short, two-line SPDX notice defined in [AGENTS.md](AGENTS.md). Generic configuration, generated files and dependency lockfiles **do not receive license headers**. See the full [LICENSE](LICENSE).

## Contact

**Project maintainer: Keresztes Zsolt**

| Platform | Link |
| --- | --- |
| Website | [kereszteszsolt.hu](https://kereszteszsolt.hu/) |
| GitHub | [@kereszteszsolt](https://github.com/kereszteszsolt) |

> The maintainer's website is available in Hungarian (HU), English (EN), Romanian (RO), and German (DE).

## ☕ Ways to support

**Explore ways to support the maintainer and their projects.**

[https://kereszteszsolt.hu/ways-to-support](https://kereszteszsolt.hu/ways-to-support)

<p align="center">
  <a href="https://buymeacoffee.com/kereszteszsolt"><img src="docs/assets/buy-me-a-coffee-orange.png" alt="Buy Me a Coffee" width="360"></a><br>
  <strong>Every coffee counts! ☕❤️</strong>
</p>

---

<p align="center">
  <strong>Made with ❤️ by <a href="https://kereszteszsolt.hu/">Keresztes Zsolt</a></strong><br>
  ⭐ Star this repository if you find it useful!
</p>
