// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";

const { database, query } = vi.hoisted(() => ({
  database: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/server/db", () => ({ getDatabase: database }));

import { GET } from "@/app/api/health/route";

beforeEach(() => {
  vi.resetAllMocks();
  database.mockReturnValue({ $queryRaw: query });
});

describe("GET /api/health", () => {
  it("reports readiness only after a successful database query", async () => {
    query.mockResolvedValue([{ "?column?": 1 }]);
    const response = await GET();
    expect(query).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok", database: "connected" });
  });

  it("returns a generic uncached 503 for database failures", async () => {
    query.mockRejectedValue(new Error("postgresql://local:test-only-secret@db/open_nook"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "unavailable", database: "unavailable" });
  });

  it("returns a safe 503 when configuration prevents client creation", async () => {
    database.mockImplementation(() => { throw new Error("Invalid secret configuration"); });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(query).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ status: "unavailable", database: "unavailable" });
  });
});
