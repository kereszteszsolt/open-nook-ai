// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { parseDatabaseUrl } from "@/server/env";

const databaseGlobal = globalThis as typeof globalThis & {
  openNookDatabase?: PrismaClient;
};

export function getDatabase(): PrismaClient {
  if (!databaseGlobal.openNookDatabase) {
    const adapter = new PrismaPg({
      connectionString: parseDatabaseUrl(process.env.DATABASE_URL),
      connectionTimeoutMillis: 3_000,
      query_timeout: 3_000,
      statement_timeout: 3_000,
      idleTimeoutMillis: 10_000,
      max: 5,
    });
    databaseGlobal.openNookDatabase = new PrismaClient({
      adapter,
      errorFormat: "minimal",
      log: [],
    });
  }
  return databaseGlobal.openNookDatabase;
}
