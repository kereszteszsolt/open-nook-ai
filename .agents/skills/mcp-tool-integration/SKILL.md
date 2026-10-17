---
name: mcp-tool-integration
description: Use only for approved later OpenNook AI work on MCP clients, tool discovery, backend-enforced tool permissions, tool-calling loops, user consent and secure integration testing.
---

# MCP and tool integration engineering

## Load when

A separately approved ONK-005–008 story changes MCP discovery/execution, model-initiated tool calls or the **runtime** custom-skill permission model. The implemented Release 0.1 does not include MCP or runtime skills. Planning docs and the existence of this Codex skill confer no implementation permission.

## Technical practices

1. Use a server-side MCP client and documented transports supported by the chosen SDK version. Explicitly allowlist servers, destinations, protocols and exposed tools; do not accept arbitrary URLs, localhost/private-network targets or credential-bearing configuration from untrusted chats.
2. Treat descriptions, tool outputs and skill instructions as untrusted data. The model cannot grant permissions or select tools beyond the backend allowlist. Separate *which tools exist*, *which are enabled* and *which a skill suggests*.
3. Start with a single tested **read-only** integration. Display tool name, arguments and outcomes; bound timeouts, output sizes and retry counts.
4. Require explicit user confirmation for any state-changing operation in a later scoped story. Do not let prompt text bypass confirmation or execute unapproved file/system operations.
5. Keep OAuth/API keys encrypted or in dedicated server-side secrets; never put raw credentials into tool manifests, model context, database JSON or browser state.
6. A custom skill provides a limited instruction set and optional allowlisted tool binding. Manually activate skills before considering automatic routing; instructions never expand capabilities.

## Verification

Use deterministic fake MCP servers and denied-tool tests. Add one safe, documented integration smoke test only after separate approval. Record permitted/denied behavior and observed security limitations; never imply broad MCP compatibility based on one server.
