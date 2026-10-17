# Story-driven Codex workflow

The main Codex session handles **one approved `ONK-*` story** at a time. It may delegate to an optional sole-writer agent; do not start redundant reviewers or parallel implementations.

## Story format

Every Release 0.1 story contains these sections, in order:

1. `Status` — `Planned`, `In progress` or `Implemented`
2. `User story`
3. `Goal`
4. `Dependencies`
5. `Acceptance criteria` — short, testable checkboxes (aim for 4–8)
6. `Out of scope`

All four MVP stories begin `Planned`, and **unchecked acceptance criteria remain unchecked** until verified.

## Implementation and commit gates

1. Codex identifies the next valid story, intended files and risks, and asks permission to **implement**.
2. Codex changes only its agreed scope. Keep technical methods in skills and feature behavior in source/docs; do not duplicate instructions in many files.
3. Run focused tests, then relevant integration/browser/container checks if needed. Never perform unapproved billable OpenRouter calls.
4. Add actual commands and results to the active `verification.md`, including failures and `Not run`. A blocked requirement remains unchecked.
5. Review the diff; propose a commit message and ask **separately** for permission to commit.
6. After an approved commit, record its actual hash and ask before moving to the next story. No automatic commit, push, force push or history rewrite.

## Source and documentation conventions

- Apply the concise SPDX source notice from [AGENTS.md](../AGENTS.md) to eligible new hand-written application source, **not** generic configuration or generated files.
- Limit comments to non-obvious decisions, using short sentences. Keep plans and historical evidence in Markdown.
- A future roadmap entry is **not** approval to implement MCP/Skills, OAuth, vision or other later features.
- The last release story reconciles README status, docs, CI, tests and actual dependencies with what truly shipped. Do not invent results or screenshots.
