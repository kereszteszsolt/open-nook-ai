// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { publicModels, readAIConfiguration } from "@/server/ai/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json(publicModels(readAIConfiguration()), { headers });
  } catch {
    return Response.json(
      { enabled: false, status: "invalid_configuration", models: [] },
      { status: 503, headers },
    );
  }
}
