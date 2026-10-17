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
  messages: z.array(message).min(1).max(32),
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

export async function readChatRequest(request: Request, signal: AbortSignal) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ChatRequestError(415, "unsupported_content_type", "Send an application/json request.");
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_REQUEST_BYTES)) {
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
      if (bytes > MAX_REQUEST_BYTES) {
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
    const result = chatRequest.safeParse(input);
    if (!result.success) {
      throw new ChatRequestError(400, "invalid_request", "Send bounded text messages and a configured model.");
    }
    return {
      model: result.data.model,
      messages: result.data.messages.map((item) => ({
        role: item.role,
        content: item.parts.map((part) => part.text).join(""),
      })),
    };
  } finally {
    signal.removeEventListener("abort", onAbort);
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
