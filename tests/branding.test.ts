// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { brand } from "@/shared/branding";

const urls = ["appWebsite", "appGithubUrl", "authorWebsite", "authorGithub", "authorWaysToSupportUrl", "authorBuyMeACoffeeUrl"] as const;
const assets = ["appFavicon", "appIcon", "appPoster"] as const;

describe("public branding metadata", () => {
  it("has visible identity fields and an informational license label", () => {
    expect(brand.appName.trim().length).toBeGreaterThan(0);
    expect(brand.authorName.trim().length).toBeGreaterThan(0);
    expect(brand.license).toBe("Apache-2.0");
  });

  it("uses only explicit HTTPS links or empty optional fields", () => {
    for (const field of urls) {
      const url = brand[field];
      if (url) expect(new URL(url).protocol).toBe("https:");
    }
  });

  it("constrains optional asset references to same-origin brand files", () => {
    for (const field of assets) {
      const path = brand[field];
      if (path) expect(path).toMatch(/^\/brand\/assets\/[a-zA-Z0-9._-]+$/);
    }
  });
});
