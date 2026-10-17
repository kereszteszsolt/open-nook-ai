# ONK-005: Trusted MCP Connection & Discovery

## Status

Planned

## User story

As a local user, I want to enable a trusted MCP connection so I can see which external read-only tools the assistant could use.

## Goal

Introduce one intentionally configured MCP connection and limited server-side tool discovery, without model tool execution yet.

## Dependencies

Release 0.1 verified locally (ONK-001–004). No need for browser-visible secrets.

## Acceptance criteria

- [ ] Provide exactly one documented, **preapproved** read-only MCP integration for the initial demo; disabled by default. Select transport according to the tested SDK rather than assuming all MCP servers work.
- [ ] Load connection endpoint/credentials from server-only configuration. Reject arbitrary browser-provided URLs, unexpected redirects and unapproved destinations (including private-network/localhost targets unless explicitly trusted for local development).
- [ ] Add a minimal enable/disable/status UI; no automatic connections or external calls on page load.
- [ ] Discover tools on the server, restrict to configured read-only tool names and return only bounded, non-secret metadata to the UI.
- [ ] Handle offline/timeouts, malformed metadata, unexpected tools and oversized responses without exposing credentials or opening further connections.
- [ ] Provide deterministic fake-MCP tests for allowed, denied and unavailable paths; update focused security/configuration docs. Live integration smoke is optional and requires approval.

## Out of scope

Model-initiated tool calls, writes, OAuth/account connection flows, arbitrary user-specified MCP servers, runtime skills, new multi-agent framework.

## Verification

Not run; write real outcomes in [release verification](../verification.md) when separately authorized and implemented. Mark completed criteria only after evidence exists.
