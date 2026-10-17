// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { brand } from "@/shared/branding";
import { ChatRequestError } from "@/server/ai/request";
import { ConversationError } from "./errors";

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const expected = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if (origin && origin !== expected) {
    throw new ConversationError(403, "invalid_origin", `Send this request from ${brand.appName}.`);
  }
}
export function conversationId(value: string) {
  if (!z.uuid().safeParse(value).success) throw new ConversationError(400, "invalid_request", "Select a saved chat.");
  return value;
}
export function storageError(error: unknown): Response {
  const known = error instanceof ConversationError || error instanceof ChatRequestError;
  return Response.json({ error: { code: known ? error.code : "storage_unavailable", message: known ? error.message : "Saved chats are unavailable. Check the database and try again." } },
    { status: known ? error.status : 503, headers: { "Cache-Control": "no-store" } });
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
