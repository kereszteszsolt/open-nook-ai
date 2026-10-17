# Release 0.1 verification

## Status

**Planned. No implementation or application tests have been run.** The baseline contains only documentation, an example environment file and Codex metadata.

## Evidence table

| Story | State | Focused checks | Browser / Compose / live model | Notes |
| --- | --- | --- | --- | --- |
| ONK-001 | Planned | Not run | Not run | No Next.js or Prisma/Compose scaffold yet |
| ONK-002 | Planned | Not run | Not run | OpenRouter not integrated |
| ONK-003 | Planned | Not run | Not run | Chat UI and renderers not implemented |
| ONK-004 | Planned | Not run | Not run | Persistence, E2E and CI not implemented |

## Recording format

After each **approved** implementation, record the actual date, environment, files and acceptance criteria changed, exact commands and their observed results. Include lint/typecheck/unit/build/DB/browser checks as applicable. Clearly distinguish **mocked streaming tests** from **real billable OpenRouter calls**. Missing or failed checks must stay visible rather than being marked complete.

The user separately approves a commit. Only record a commit hash after the commit actually succeeds; do not imply that an approved change was pushed or released.

## Documentation baseline review — 2026-10-17

- `git diff HEAD` and `git diff --cached`: reviewed the documentation/configuration baseline; no application implementation is included.
- Read-only Python 3.14.4 audit (`python3` here-document): passed 46 relative documentation/asset links, balanced Markdown fences, parsing of both TOML files, four `Planned` stories with unchecked criteria, the documentation-only inventory and empty OpenRouter example credentials.
- `git -c core.whitespace=cr-at-eol diff HEAD --check`: passed after replacing two Markdown hard-break spaces with paragraph breaks.
- Application tests, build, browser, Compose and live OpenRouter checks: **Not run**; their implementation belongs to the planned stories above.
