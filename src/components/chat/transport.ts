// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import type { UIMessage } from "ai";

export function chatPayload(model: string, messages: UIMessage[], trigger: string, id: string, messageId?: string) {
  const context = messages.map((message) => ({
    id: message.id, role: message.role,
    parts: message.parts.filter((part) => part.type === "text").map((part) => ({ type: "text", text: part.text })),
  })).filter((message) => message.parts.some((part) => part.text.trim()));
  // A regenerate request replaces the assistant turn; the API context must end at its user prompt.
  if (trigger === "regenerate-message" && context.at(-1)?.role === "assistant") context.pop();
  if (!model || context.length < 1 || context.length > 32 || context[0].role !== "user" || context.at(-1)?.role !== "user" ||
    context.some((message) => !["user", "assistant"].includes(message.role) || message.parts.length > 8 ||
      message.parts.reduce((sum, part) => sum + part.text.length, 0) > 8000) ||
    context.reduce((sum, message) => sum + message.parts.reduce((n, part) => n + part.text.length, 0), 0) > 24_000) {
    throw new Error("This conversation exceeds the request limits. Start a new chat or shorten your message.");
  }
  const body = { model, messages: context, trigger, id, ...(messageId ? { messageId } : {}) };
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > 64 * 1024) {
    throw new Error("This conversation exceeds the request limits. Start a new chat or shorten your message.");
  }
  return body;
}
