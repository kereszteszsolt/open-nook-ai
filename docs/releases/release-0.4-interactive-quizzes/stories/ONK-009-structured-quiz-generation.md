# ONK-009: Structured Practice Quiz Generation

## Status

Planned

## User story

As a learner, I want an AI-generated practice quiz on my chosen topic so that I can check what I know.

## Goal

Implement bounded structured quiz generation and storage with a server-private answer key, separate from conversational clarification questions.

## Dependencies

Release 0.1 chat foundation; subsequent quiz UI may reuse chat renderers but must not depend on MCP/Skills.

## Acceptance criteria

- [ ] Accept a learner topic/instructions, question count (1 or a small bounded set), and optional difficulty; only configured OpenRouter models can generate.
- [ ] Generate practice questions through schema-validated structured outputs, supporting single-choice and multi-select options, answer key and short explanation.
- [ ] Validate answer-key indices, unique question IDs, option bounds, lengths and total counts; reject malformed/empty model output without claiming a valid quiz.
- [ ] Persist the generated practice quiz and server-side answer key in PostgreSQL (additive Prisma migration) with no browser access to correct answers before submission.
- [ ] Expose a safe quiz DTO to the browser containing questions/options but **not** answer keys or explanations that reveal answers before submission.
- [ ] Add deterministic mocked-provider, schema/error and persistence tests; show that AI-generated factual correctness is not independently guaranteed.

## Out of scope

Grading free-text essays, high-stakes certification, perfect answer guarantee, sharing/public quiz links, quiz user accounts, MCQ result generation by the model.

## Verification

Not run; write real outcomes in [release verification](../verification.md) when separately authorized and implemented. Mark completed criteria only after evidence exists.
