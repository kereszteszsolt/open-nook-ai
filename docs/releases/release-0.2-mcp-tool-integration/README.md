# Release 0.2 — MCP Tool Integration

## Status

**Planned — not implemented.** This release contains approved planning documents and testable acceptance criteria, **not** working MCP/Skills/Quiz features. One story is implemented only after separate, explicit user approval. Do not rewrite Release 0.1 verification as part of planning.

## Goal

Add a small, trusted read-only MCP integration, with the server enforcing tool permissions and bounded model tool calls.

## Prerequisites

Release 0.1 completed. Current **single-user, localhost-only** boundaries remain: do not expose the app publicly without authentication, isolation and cost controls.

## Stories

| Story | Scope | Status |
| --- | --- | --- |
| [ONK-005](stories/ONK-005-trusted-mcp-connection-and-discovery.md) | Trusted MCP Connection & Discovery | Planned |
| [ONK-006](stories/ONK-006-controlled-tool-calling-and-verification.md) | Controlled Tool Calling & Verification | Planned |

## Guardrails

No arbitrary URL-based MCP registration, unrestricted remote fetching, file writes or silent tool invocation. Any tool and remote integration must be expressly allowlisted.

All checks must be recorded as **observed evidence** in [verification.md](verification.md). Planned acceptance criteria do not imply implementation, deployment or successful tests.
