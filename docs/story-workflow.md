# Story-driven Codex workflow

The main Codex session handles **one approved `ONK-*` story** at a time. An optional sole-writer agent can be delegated one story; do not spawn redundant parallel implementers or reviewers.

## Story format

Each story contains `Status`, `User story`, `Goal`, `Dependencies`, `Acceptance criteria`, `Out of scope` and `Verification`. The **Release 0.1** stories are implemented and retain their historical evidence. **ONK-005–011** begin `Planned`, and all their acceptance criteria remain unchecked until independently verified.

## Implementation and commit gates

1. Identify the approved story, affected files, risks and relevant technical skill; request permission to **implement**.
2. Edit only that story's agreed scope. Domain requirements belong to the story; technical practices belong to the skill. Never implement a whole release silently.
3. Run focused tests, then affected browser, database and Compose checks where relevant. Fake MCP servers and mocked OpenRouter are the default.
4. Record **actual** commands and observations in that release's `verification.md`. Missing checks are `Not run`, not `Passed`.
5. Review the diff and ask **separately** for commit/push approval. Do not commit or touch later stories without permission.

## Security and source conventions

- Never call billable OpenRouter models, unknown MCP services or write-capable tools without specific approval.
- For untrusted tool output and generated quiz content, use server-side validation and data isolation, not prompt instructions alone.
- A saved Skill is instruction text, not permission; the AI model cannot broaden the backend's allowlist.
- Quiz scoring is deterministic for objective choices. Chat clarification questions are **ungraded** and require deliberate user submission.
- [Brand metadata](branding.md) controls **visible identity only**, not SPDX notices, `LICENSE`, secrets, model names or approvals.
- Apply the short SPDX notice to new manually authored app source only, never to generic/generated configuration, lockfiles, Markdown, JSON, binaries, migrations or other excluded files.

After the last story of a release, reconcile README, security/docs, GitHub metadata and verification with what actually shipped. Do not invent successful tests or screenshots.
