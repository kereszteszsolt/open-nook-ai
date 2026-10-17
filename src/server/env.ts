// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const databaseUrl = z.url().pipe(z.string().refine((value) => {
  const url = new URL(value);
  return (
    ["postgresql:", "postgres:"].includes(url.protocol) &&
    Boolean(url.hostname && url.username && url.password) &&
    url.pathname.length > 1
  );
}));

export function parseDatabaseUrl(value: string | undefined): string {
  const result = databaseUrl.safeParse(value);
  if (!result.success) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL URL with a host, database, username and password.",
    );
  }
  return result.data;
}
