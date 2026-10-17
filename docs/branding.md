# Brand metadata — presentation only

**Available now.** OpenNook keeps its own small, typed application-brand settings in [`public/brand/branding.json`](../public/brand/branding.json). This is a per-repository convention, **not** a shared branding framework or a way to alter licensing.

## Fields

| Field | Meaning / display |
| --- | --- |
| `appName` | Browser title, chat wordmark and assistant label |
| `appWebsite` | Optional About link; empty string hides it |
| `appGithubUrl` | Link to the application's repository |
| `authorName` | Visible author/maintainer and small copyright display |
| `authorWebsite` | About link to author website |
| `authorGithub` | About link to author GitHub |
| `authorWaysToSupportUrl` | Author's general support options page |
| `authorBuyMeACoffeeUrl` | Direct Buy Me a Coffee support link |
| `license` | **Informational display only**, e.g. `Apache-2.0` |
| `appFavicon` | Optional same-origin browser tab icon path |
| `appIcon` | Optional same-origin app wordmark icon / icon metadata path |
| `appPoster` | Optional same-origin Open Graph/social poster path |

Put optional image files in [`public/brand/assets/`](../public/brand/assets/) and configure paths such as `/brand/assets/icon.svg`, `/brand/assets/favicon.ico` or `/brand/assets/poster.png`. They may be blank; the UI then uses its text/symbol fallback, and unused metadata is omitted. **No icon or poster is bundled with this change.** Keep images small and trusted, and avoid remote URLs and JavaScript/SVG that executes scripts. Do not assume a favicon, Apple icon or social card exists until you supply the asset and path.

The JSON file and public assets are intentionally included in the app's Docker image. Only public, non-secret values belong here: API keys, MCP credentials, conversation data and usage limits belong in the server environment/database instead.

## License boundary

The `license` setting is just the label in the application's About panel. It must **never rewrite** the repository's real [`LICENSE`](../LICENSE), README legal terms or hand-written source-code SPDX notices. Keep legal attribution according to Apache-2.0 even when the display name is customized. JSON, assets and general/generated configuration **must not receive SPDX headers**.

The application version remains in [`package.json`](../package.json), not duplicated in branding. GitHub repository About and Topics also remain separate settings.

## Evidence

This brand integration is an explicitly requested maintenance change alongside release planning. It does not mark ONK-005–011 as implemented, and it does not change the previously recorded Release 0.1 verification. Record any newly run checks separately before claiming production readiness.
