// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import appMetadata from "../../brand/branding.json";

export const appInfo = {
  ...appMetadata,
  icon: appMetadata.appIcon ? `/app-assets/${appMetadata.appIcon}` : "",
  favicon: appMetadata.appFavicon ? `/app-assets/${appMetadata.appFavicon}` : "",
  poster: appMetadata.appPoster ? `/app-assets/${appMetadata.appPoster}` : "",
};

export const license = { name: "Apache-2.0", href: "/license.txt" };
