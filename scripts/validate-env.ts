// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { parseDatabaseUrl } from "../src/server/env.ts";

try {
  parseDatabaseUrl(process.env.DATABASE_URL);
} catch {
  console.error("Set DATABASE_URL to a PostgreSQL URL with a host, database, username and password.");
  process.exitCode = 1;
}
