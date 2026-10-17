// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { getDatabase } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    await getDatabase().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "connected" }, { headers });
  } catch {
    return Response.json(
      { status: "unavailable", database: "unavailable" },
      { status: 503, headers },
    );
  }
}
