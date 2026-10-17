// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { readJsonRequest, ChatRequestError } from "@/server/ai/request";
import { createConversation, listConversations } from "@/server/conversations/store";
import { conversationId, json, sameOrigin, storageError } from "@/server/conversations/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cursor = new URL(request.url).searchParams.get("cursor");
    return json(await listConversations(cursor === null ? undefined : conversationId(cursor)));
  } catch (error) { return storageError(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const value = await readJsonRequest(request, AbortSignal.any([request.signal, AbortSignal.timeout(3000)]), 2048);
    if (!z.object({}).strict().safeParse(value).success) throw new ChatRequestError(400, "invalid_request", "Send an empty JSON object to start a chat.");
    return json(await createConversation(), 201);
  } catch (error) { return storageError(error); }
}
