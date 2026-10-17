// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { deleteConversation, getConversation } from "@/server/conversations/store";
import { ConversationError } from "@/server/conversations/errors";
import { conversationId, json, sameOrigin, storageError } from "@/server/conversations/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try { return json(await getConversation(conversationId((await context.params).id))); }
  catch (error) { return storageError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const version = new URL(request.url).searchParams.get("version");
    if (version === null || !/^\d{1,10}$/.test(version) || Number(version) > 2_000_000_000) {
      throw new ConversationError(400, "invalid_request", "Provide the saved chat version.");
    }
    await deleteConversation(conversationId((await context.params).id), Number(version));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return storageError(error); }
}
