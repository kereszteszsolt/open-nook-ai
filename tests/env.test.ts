// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { parseDatabaseUrl } from "@/server/env";

describe("database configuration", () => {
  it.each([
    "postgresql://local:example-password@db:5432/open_nook?schema=public",
    "postgres://local:example-password@127.0.0.1:5433/open_nook",
  ])("accepts a complete PostgreSQL URL: %s", (url) => {
    expect(parseDatabaseUrl(url)).toBe(url);
  });

  it.each([
    undefined,
    "",
    "not-a-url",
    "https://local:example-password@db/open_nook",
    "postgresql://db/open_nook",
    "postgresql://local@db/open_nook",
    "postgresql://local:example-password@db",
  ])("rejects missing or invalid settings without echoing the value", (url) => {
    expect(() => parseDatabaseUrl(url)).toThrow(
      "DATABASE_URL must be a PostgreSQL URL with a host, database, username and password.",
    );
  });

  it("keeps credentials out of validation errors", () => {
    const secret = "unique-test-only-secret";
    let caught: unknown;
    try {
      parseDatabaseUrl(`https://local:${secret}@db/open_nook`);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(String(caught)).not.toContain(secret);
  });
});
