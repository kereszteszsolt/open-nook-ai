# ONK-011: Ungraded Chat Clarifications & Release Verification

## Status

Planned

## User story

As a chat user, I want the assistant to ask one or several clarification questions with optional choices when it needs more information.

## Goal

Provide a reusable structured-question UI inside chat that collects answers and resumes a normal conversation without scoring.

## Dependencies

ONK-009/010 structured UI patterns and existing Release 0.1 streaming/persistence.

## Acceptance criteria

- [ ] Support an optional assistant clarification request with one question or a bounded group; a question may accept free text, one choice or multiple choices.
- [ ] Render questions within the chat as clearly labelled **Clarification** rather than **Practice Quiz**; no correct answer, score, pass/fail or answer key exists for clarifications.
- [ ] Only submit answers the user confirms; do not automatically send a provider call, execute tools or enable integrations when merely displaying a question.
- [ ] Resume the current conversation after answers are submitted, preserving previous context and server-side message limits; provide a safe text fallback for models that cannot produce structured questions.
- [ ] Preserve clarification and answer state through reload/stop/retry without creating duplicate turns or bypassing the existing conversation version/lease checks.
- [ ] Run focused tests for choice/text inputs, multiple questions, keyboard controls, invalid payloads, cancellation and persisted continuation. Update README/roadmap/status and record only real verification.

## Out of scope

Autonomous tool authorization, automatic skill selection, scored quiz semantics, graded follow-up questions, support for public shared chats.

## Verification

Not run; write real outcomes in [release verification](../verification.md) when separately authorized and implemented. Mark completed criteria only after evidence exists.
