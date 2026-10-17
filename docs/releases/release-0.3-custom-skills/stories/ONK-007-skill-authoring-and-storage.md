# ONK-007: Skill Authoring & Storage

## Status

Planned

## User story

As a local user, I want to save my own AI instruction templates so that I can reuse them in later chats.

## Goal

Implement a small CRUD UI and Prisma persistence for text-only, user-authored runtime skills. A skill is not executable code.

## Dependencies

Release 0.2 completed. Keep the single-user/localhost-only deployment restriction.

## Acceptance criteria

- [ ] Add a `Skill` record with stable ID, bounded name, optional description, instruction text, timestamps and explicit enabled state; migrate additively without losing conversations.
- [ ] Create, list, edit and delete skills through validated same-origin Next.js endpoints and a minimal, accessible UI. Reject oversized, empty or malformed instructions.
- [ ] Skill content is **data**, not code, a model-executable script, an MCP server declaration or a legal license setting. Do not eval, run or import uploaded skill text.
- [ ] Do not activate a newly created skill automatically, and do not grant any MCP permission from its text.
- [ ] Keep instruction length/context contribution bounded and document that user-authored instructions do not override system safety policy.
- [ ] Add deterministic CRUD, validation and migration tests plus a database-aware verification note.

## Out of scope

Automatic skill recommendation, arbitrary executable plugins, imported scripts, GitHub/Codex `.agents/skills` execution, shared marketplace.

## Verification

Not run; write real outcomes in [release verification](../verification.md) when separately authorized and implemented. Mark completed criteria only after evidence exists.
