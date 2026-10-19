// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { brand, license } from "@/shared/brand";

export function Attribution({ showWebsite = true }: { showWebsite?: boolean }) {
  return <footer className="brand-attribution">
    <span className="copyright-line">© <span suppressHydrationWarning>{new Date().getFullYear()}</span> {brand.authorName},{" "}
      <a href={license.href} target="_blank" rel="noopener noreferrer">{license.name}</a>
    </span>
    {showWebsite && brand.authorWebsite && <a className="attribution-website" href={brand.authorWebsite} target="_blank" rel="noopener noreferrer">{brand.authorWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>}
  </footer>;
}
