// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import branding from "../../brand/branding.json";

export const brand = {
  ...branding,
  icon: branding.appIcon ? `/brand/${branding.appIcon}` : "",
  favicon: branding.appFavicon ? `/brand/${branding.appFavicon}` : "",
  poster: branding.appPoster ? `/brand/${branding.appPoster}` : "",
};

export const license = { name: "Apache-2.0", href: "/license.txt" };
