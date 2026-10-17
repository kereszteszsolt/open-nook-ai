# ONK-008: Manual Skill Activation & Tool Binding

## Status

Planned

## User story

As a local user, I want to manually activate a skill for one chat and choose which available tools it can suggest using.

## Goal

Bind runtime skills to conversations and allowlisted MCP tools without broadening backend permissions.

## Dependencies

ONK-007 and ONK-006 completed.

## Acceptance criteria

- [ ] Provide manual activate/deactivate controls per conversation; clearly display active skill and integration state, persisting only explicitly selected associations.
- [ ] Allow the user to associate a skill with a subset of already permitted, read-only MCP tool IDs; missing/disconnected tools are treated as unavailable.
- [ ] The executable tool set is always the intersection of backend policy, enabled connection, conversation authorization and the skill-selected subset. Skill text can **never** add permissions.
- [ ] Build the model context from bounded skill instructions with a documented precedence order; skill text and tool output are untrusted and cannot override server-side controls.
- [ ] Changing or deleting a skill/integration cleans up associations without leaking tool access into other conversations.
- [ ] Test inactive skill, permitted/denied tool, revoke/deletion, persistence and prompt injection in skill instructions using no billed calls; document any intentionally unimplemented authorization limits.

## Out of scope

Model-autonomous skill switching, write-capable MCP operations, multi-agent orchestration, external skill marketplace or public multi-user hosting.

## Verification

Not run; write real outcomes in [release verification](../verification.md) when separately authorized and implemented. Mark completed criteria only after evidence exists.
