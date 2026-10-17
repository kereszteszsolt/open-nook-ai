// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import type { UIMessage } from "ai";
import { chatPayload } from "@/components/chat/transport";

const user: UIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Hello" }] };
it("sends the selected model and text-only UI context without metadata or provider options", () => {
  const body = chatPayload("test/one", [{ ...user, metadata: { internal: true }, parts: [...user.parts, { type: "file", mediaType: "image/png", url: "https://private.invalid" }] }], "submit-message", "tab-1");
  expect(body).toEqual({ model: "test/one", id: "tab-1", trigger: "submit-message", messages: [user] });
});
it("regenerates from the original user prompt without duplicating turns", () => {
  const assistant: UIMessage = { id: "a1", role: "assistant", parts: [{ type: "text", text: "Partial answer" }] };
  expect(chatPayload("test/one", [user, assistant], "regenerate-message", "tab-1", "a1").messages).toEqual([user]);
});
it("omits an empty failed assistant placeholder from the next context", () => {
  expect(chatPayload("test/one", [user, { id: "a1", role: "assistant", parts: [] }, { ...user, id: "u2" }], "submit-message", "tab-1").messages).toHaveLength(2);
});
it.each(["x".repeat(8001), "😀".repeat(4001)])("rejects oversized individual text before network access %#", (text) => {
  expect(() => chatPayload("test/one", [{ ...user, parts: [{ type: "text", text }] }], "submit-message", "tab-1")).toThrow(/limits/);
});
it("rejects oversized context and UTF-8 body", () => {
  const messages = Array.from({ length: 4 }, (_, i) => ({ ...user, id: String(i), parts: [{ type: "text" as const, text: "x".repeat(7000) }] }));
  expect(() => chatPayload("test/one", messages, "submit-message", "tab-1")).toThrow(/limits/);
  const wide = Array.from({ length: 3 }, (_, i) => ({ ...user, id: String(i), parts: [{ type: "text" as const, text: "漢".repeat(8000) }] }));
  expect(() => chatPayload("test/one", wide, "submit-message", "tab-1")).toThrow(/limits/);
});
