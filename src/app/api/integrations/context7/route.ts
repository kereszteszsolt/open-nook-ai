// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { ChatRequestError, readJsonRequest } from "@/server/ai/request";
import { ConversationError } from "@/server/conversations/errors";
import { json, sameOrigin } from "@/server/conversations/http";
import { context7Integration } from "@/server/mcp/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response { return json(context7Integration.status()); }
export async function POST(request: Request): Promise<Response> {
  try {
    sameOrigin(request);
    const input = z.object({ action: z.enum(["enable", "disable"]) }).strict()
      .safeParse(await readJsonRequest(request, AbortSignal.any([request.signal, AbortSignal.timeout(3000)]), 256));
    if (!input.success) throw new ChatRequestError(400, "invalid_request", "Choose enable or disable for Context7.");
    const snapshot = input.data.action === "disable" ? context7Integration.disable() : await context7Integration.enable(request.signal);
    return json(snapshot, ["unavailable", "not_configured", "invalid_configuration"].includes(snapshot.status) ? 503 : 200);
  } catch (error) {
    const known = error instanceof ChatRequestError || error instanceof ConversationError;
    return json({ error: { code: known ? error.code : "integration_unavailable", message: known ? error.message : "Context7 discovery is unavailable. Try again." } }, known ? error.status : 503);
  }
}
