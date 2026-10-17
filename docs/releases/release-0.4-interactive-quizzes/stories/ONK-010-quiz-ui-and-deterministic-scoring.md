# ONK-010: Quiz UI & Deterministic Scoring

## Status

Planned

## User story

As a learner, I want to answer practice questions either all at once or one page at a time and see my results.

## Goal

Build accessible quiz-taking UI and deterministic server-side grading for objectively verifiable option selections.

## Dependencies

ONK-009 completed, including private answer keys.

## Acceptance criteria

- [ ] Offer layouts for a single question, several questions on one page, and step-by-step paginated questions (same saved quiz and backend scoring).
- [ ] Support single-choice radio and multi-select checkbox answers; preserve selections while navigating and support keyboard accessibility.
- [ ] Disable answer revelation before submission; upon submission, grade single-choice and multi-select using exact set matching on the server, not another LLM.
- [ ] Display total correct/count and per-question feedback/explanation only after submission; clarify that scores are practice indicators, not official assessments.
- [ ] Validate submitted IDs and option IDs, enforce basic size limits and idempotent submission behavior; do not trust client-supplied answers or scores.
- [ ] Add mocked browser/API/database checks for both layouts, navigation, missing answers, scoring boundaries and errors; record observed outcomes.

## Out of scope

Free-text automatic grading, negative marking, leaderboard, certification, timer/anti-cheat or published quiz sharing.

## Verification

Not run; write real outcomes in [release verification](../verification.md) when separately authorized and implemented. Mark completed criteria only after evidence exists.
