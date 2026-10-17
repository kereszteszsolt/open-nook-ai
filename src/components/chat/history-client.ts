// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import type { UIMessage } from "ai";
import { conversationPage, conversationSummary, savedConversation, type SavedConversation } from "@/shared/conversations";

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000), ...init });
  if (!response.ok) throw new Error("Saved chats are unavailable. Reload saved history before continuing.");
  return response;
}
export async function createChat() {
  return conversationSummary.parse(await (await request("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json());
}
export async function loadChat(id: string) {
  return savedConversation.parse(await (await request(`/api/conversations/${encodeURIComponent(id)}`)).json());
}
export async function loadHistory(cursor?: string) {
  return conversationPage.parse(await (await request(`/api/conversations${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`)).json());
}
export async function removeChat(id: string, version: number) {
  await request(`/api/conversations/${encodeURIComponent(id)}?version=${version}`, { method: "DELETE" });
}
export function uiMessages(saved: SavedConversation): UIMessage[] {
  return saved.messages.map((message) => ({ id: message.id, role: message.role,
    parts: [{ type: "text", text: message.content }],
    metadata: { savedStatus: message.status, modelId: message.modelId, finishReason: message.finishReason },
  }));
}
export function selectChatUrl(id?: string) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("conversation", id); else url.searchParams.delete("conversation");
  window.history.replaceState(null, "", url);
}
