// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import settings from "../../public/brand/branding.json";

export type BrandMetadata = {
  appName: string;
  appWebsite: string;
  appGithubUrl: string;
  authorName: string;
  authorWebsite: string;
  authorGithub: string;
  authorWaysToSupportUrl: string;
  authorBuyMeACoffeeUrl: string;
  license: string;
  appFavicon: string;
  appIcon: string;
  appPoster: string;
};

// Presentation metadata only; never drives LICENSE, SPDX notices, auth or API secrets.
export const brand: BrandMetadata = settings;
