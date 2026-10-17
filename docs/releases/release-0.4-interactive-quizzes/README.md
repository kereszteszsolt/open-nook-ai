# Release 0.4 — Interactive Quizzes & Clarifications

## Status

**Planned — not implemented.** This release contains approved planning documents and testable acceptance criteria, **not** working MCP/Skills/Quiz features. One story is implemented only after separate, explicit user approval. Do not rewrite Release 0.1 verification as part of planning.

## Goal

Add AI-generated practice quizzes with objective scoring, plus optional ungraded clarification questions directly inside chat.

## Prerequisites

Release 0.1 chat foundation (and compatible structured UI patterns); 0.2/0.3 are not technical prerequisites for the quiz engine. Current **single-user, localhost-only** boundaries remain: do not expose the app publicly without authentication, isolation and cost controls.

## Stories

| Story | Scope | Status |
| --- | --- | --- |
| [ONK-009](stories/ONK-009-structured-quiz-generation.md) | Structured Practice Quiz Generation | Planned |
| [ONK-010](stories/ONK-010-quiz-ui-and-deterministic-scoring.md) | Quiz UI & Deterministic Scoring | Planned |
| [ONK-011](stories/ONK-011-ungraded-chat-clarifications-and-verification.md) | Ungraded Chat Clarifications & Release Verification | Planned |

## Guardrails

Practice quiz option scoring is deterministic and server-side; the LLM never assigns authoritative scores. In-chat clarification questions are never graded.

All checks must be recorded as **observed evidence** in [verification.md](verification.md). Planned acceptance criteria do not imply implementation, deployment or successful tests.
