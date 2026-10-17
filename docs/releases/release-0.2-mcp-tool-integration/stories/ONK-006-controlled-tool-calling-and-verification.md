# ONK-006: Controlled Tool Calling & Verification

## Status

Planned

## User story

As a local user, I want the assistant to use a tool I explicitly enabled, while the application keeps control over what can run.

## Goal

Implement bounded read-only tool calling through the existing AI SDK and the approved MCP client.

## Dependencies

ONK-005 completed; a compatible model/tool-calling adapter covered by deterministic tests. Optional live OpenRouter compatibility smoke requires a separate explicit user approval.

## Acceptance criteria

- [ ] Only the backend-approved, currently enabled MCP tools can be advertised to the selected compatible model; unsupported models fail clearly rather than silently invoking tools.
- [ ] Validate each tool name and arguments on the server immediately before execution; reject unexpected tools, invalid arguments, write actions and tool requests not enabled for that conversation.
- [ ] Apply bounded tool-call count/depth, timeout, request/response size and explicit failure handling; do not loop indefinitely or silently repeat billable requests.
- [ ] Show user-visible tool invocation status, tool name and safe results; do not expose secrets or full sensitive payloads in logs.
- [ ] Treat retrieved tool results as untrusted context, not instructions. No unapproved filesystem/network actions, resource modification or dynamic MCP server registration.
- [ ] Add mocked provider + fake-server tests proving permitted call, denied call, tool failure, timeout and zero calls when disabled; record actual checks in verification.

## Out of scope

Write-capable tools, user-supplied arbitrary API endpoints, automatic integration selection, custom skills, agent orchestration or authentication for public hosting.

## Verification

Not run; write real outcomes in [release verification](../verification.md) when separately authorized and implemented. Mark completed criteria only after evidence exists.
