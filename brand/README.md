# OpenNook AI branding

[`branding.json`](branding.json) follows the TypeNudge display-branding contract. Edit project metadata here. It contains no credentials or runtime provider configuration.

The field order below is shared by every repository using this branding structure. Keep the JSON keys in exactly this order and preserve all field values when reordering them.

| Field | Meaning |
| --- | --- |
| `appName` | Display name |
| `appTagline` | Project tagline |
| `appDescription` | Project description |
| `appWebsite` | Project website; empty when none is configured |
| `appGithubUrl` | Project repository |
| `appFavicon` | Optional local favicon |
| `appIcon` | Optional local project mark |
| `appPoster` | Optional local project poster |
| `authorName` | Author display name |
| `authorWebsite` | Author website |
| `authorWebsiteLanguages` | Ordered language codes for the author website |
| `authorGithub` | Author GitHub profile |
| `authorWaysToSupportUrl` | General ways to support the author |
| `authorBuyMeACoffeeUrl` | Direct Buy Me a Coffee link |
| `supportRemarkText` | Voluntary-support notice |

Asset paths are relative to this `brand/` directory and must stay inside `assets/`. Empty paths mean no image. These are source paths, not public URLs: consumers must package or map them to their own public base. Do not fetch remote artwork or resolve arbitrary filesystem paths.

The SVG and PNG posters are unchanged copies of `kereszteszsolt/project-cards/open-nook-ai-poster.*` from the profile repository. `appPoster` selects the vector version; the PNG is the social-preview alternative. `assets/open-nook-ai-icon.svg` is the app icon and favicon: it adapts the poster's cream code bubble, mint diagram bubble, golden conversation and forest-green palette to a compact vector mark. Preserve the original posters when adding variants.

This directory is the project branding and artwork catalog. `src/shared/brand.ts` imports the metadata for the header, browser title/favicon, sidebar attribution and About dialog. The About dialog follows the shared project layout: poster, centered description, centered website/source/profile and coffee/support button rows, separated voluntary-support notice, and a centered copyright/license line. Links have keyboard-accessible descriptions and full URLs. The sidebar places copyright/license on one line and the author website below. Empty optional links are omitted.

`scripts/prepare-brand.mjs` runs before development and production builds. It copies only the configured local artwork into the ignored `public/brand/assets/` directory and the root license into `public/license.txt`. Docker packages that generated public directory. Update the JSON/source assets and rebuild; do not edit generated public files. The copyright year follows the current calendar year.

No extra JSON fields are needed for this project.

License identifiers and URLs are not part of the branding contract. The legal source of truth remains the root `LICENSE` and existing SPDX notices; branding edits must not rewrite those or rename stable storage/package identifiers.
