# Release 0.3 — Custom Skills

## Status

**Planned — not implemented.** This release contains approved planning documents and testable acceptance criteria, **not** working MCP/Skills/Quiz features. One story is implemented only after separate, explicit user approval. Do not rewrite Release 0.1 verification as part of planning.

## Goal

Allow the user to write text-only skills, activate them explicitly and link them to a subset of already authorized tools.

## Prerequisites

Release 0.2 completed. Current **single-user, localhost-only** boundaries remain: do not expose the app publicly without authentication, isolation and cost controls.

## Stories

| Story | Scope | Status |
| --- | --- | --- |
| [ONK-007](stories/ONK-007-skill-authoring-and-storage.md) | Skill Authoring & Storage | Planned |
| [ONK-008](stories/ONK-008-manual-skill-activation-and-tool-binding.md) | Manual Skill Activation & Tool Binding | Planned |

## Guardrails

Skills are user instructions, not trusted authorization or executable source. The backend remains the final decision-maker for every tool.

All checks must be recorded as **observed evidence** in [verification.md](verification.md). Planned acceptance criteria do not imply implementation, deployment or successful tests.
