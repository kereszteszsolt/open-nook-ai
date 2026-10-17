# Release 0.2 — MCP Tool Integration

## Status

**Partially implemented locally — ONK-005 complete; ONK-006 Planned.** Context7 discovery, enable/disable controls and bounded read-only metadata are implemented and tested with a fake server. Model tool execution is not implemented. Live Context7 and the updated hosted CI workflow remain Not run. See [configuration](../../mcp-configuration.md) and [verification](verification.md). Release 0.1 evidence is preserved.

## Goal

Add a small, trusted read-only MCP integration, with the server enforcing tool permissions and bounded model tool calls.

## Prerequisites

Release 0.1 completed. Current **single-user, localhost-only** boundaries remain: do not expose the app publicly without authentication, isolation and cost controls.

## Stories

| Story | Scope | Status |
| --- | --- | --- |
| [ONK-005](stories/ONK-005-trusted-mcp-connection-and-discovery.md) | Trusted MCP Connection & Discovery | Implemented locally |
| [ONK-006](stories/ONK-006-controlled-tool-calling-and-verification.md) | Controlled Tool Calling & Verification | Planned |

## Guardrails

No arbitrary URL-based MCP registration, unrestricted remote fetching, file writes or silent tool invocation. Any tool and remote integration must be expressly allowlisted.

All checks must be recorded as **observed evidence** in [verification.md](verification.md). Planned acceptance criteria do not imply implementation, deployment or successful tests.
