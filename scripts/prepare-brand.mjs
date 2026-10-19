// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const branding = JSON.parse(await readFile(path.join(root, "brand/branding.json"), "utf8"));
for (const asset of new Set([branding.appIcon, branding.appFavicon, branding.appPoster].filter(Boolean))) {
  if (!/^assets\/[a-zA-Z0-9_-]+\.(svg|png|ico)$/.test(asset)) throw new Error("Brand artwork must be a local file inside brand/assets.");
  const destination = path.join(root, "public/brand", asset);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, "brand", asset), destination);
}
await mkdir(path.join(root, "public"), { recursive: true });
await copyFile(path.join(root, "LICENSE"), path.join(root, "public/license.txt"));
