// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

export const MAX_REQUEST_BYTES = 64 * 1024;
export const MAX_CONTEXT_CHARACTERS = 24_000;

const identifier = z.string().min(1).max(128);
const textPart = z.object({
  type: z.literal("text"),
  text: z.string().max(8000),
  state: z.enum(["streaming", "done"]).optional(),
}).strict();
const message = z.object({
  id: identifier,
  role: z.enum(["user", "assistant"]),
  parts: z.array(textPart).min(1).max(8),
}).strict().refine((value) => {
  const text = value.parts.map((part) => part.text).join("");
  return text.trim().length > 0 && text.length <= 8000;
});
const chatRequest = z.object({
  model: z.string().min(1).max(200),
  messages: z.array(message).length(1),
  conversationId: z.uuid(),
  version: z.number().int().min(0).max(2_000_000_000),
  requestId: z.uuid(),
  id: identifier.optional(),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  messageId: identifier.optional(),
}).strict().refine(({ messages }) => (
  messages[0]?.role === "user" && messages.at(-1)?.role === "user" &&
  new Set(messages.map((item) => item.id)).size === messages.length &&
  messages.reduce((sum, item) => sum + item.parts.reduce((n, part) => n + part.text.length, 0), 0)
    <= MAX_CONTEXT_CHARACTERS
));

export class ChatRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

export async function readJsonRequest(request: Request, signal: AbortSignal, limit = MAX_REQUEST_BYTES): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ChatRequestError(415, "unsupported_content_type", "Send an application/json request.");
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > limit)) {
    throw new ChatRequestError(413, "request_too_large", "The chat request is too large.");
  }
  signal.throwIfAborted();
  if (!request.body) throw new ChatRequestError(400, "invalid_request", "Send a valid chat request.");
  const reader = request.body.getReader();
  const onAbort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", onAbort, { once: true });
  let complete = false;
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) { complete = true; break; }
      bytes += value.byteLength;
      if (bytes > limit) {
        throw new ChatRequestError(413, "request_too_large", "The chat request is too large.");
      }
      chunks.push(value);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
    } catch {
      throw new ChatRequestError(400, "invalid_request", "Send a valid chat request.");
    }
    return input;
  } finally {
    signal.removeEventListener("abort", onAbort);
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function readChatRequest(request: Request, signal: AbortSignal) {
  const result = chatRequest.safeParse(await readJsonRequest(request, signal));
  if (!result.success) throw new ChatRequestError(400, "invalid_request", "Send a bounded text prompt and a saved conversation version.");
  const input = result.data;
  const user = input.messages[0];
  return {
    model: input.model, conversationId: input.conversationId, version: input.version, requestId: input.requestId,
    regenerate: input.trigger === "regenerate-message",
    user: { id: user.id, content: user.parts.map((part) => part.text).join("") },
  };
}
