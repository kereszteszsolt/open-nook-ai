// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { appInfo, license } from "@/shared/app-info";

export function Attribution({ showWebsite = true }: { showWebsite?: boolean }) {
  return <footer className="author-attribution">
    <span className="copyright-line">© <span suppressHydrationWarning>{new Date().getFullYear()}</span> {appInfo.authorName},{" "}
      <a href={license.href} target="_blank" rel="noopener noreferrer">{license.name}</a>
    </span>
    {showWebsite && appInfo.authorWebsite && <a className="attribution-website" href={appInfo.authorWebsite} target="_blank" rel="noopener noreferrer">{appInfo.authorWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>}
  </footer>;
}
