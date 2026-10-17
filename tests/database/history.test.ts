// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { getDatabase } from "@/server/db";
import { beginTurn, createConversation, deleteConversation, finishTurn, getConversation, listConversations } from "@/server/conversations/store";
import { POST as chat } from "@/app/api/chat/route";
import { GET as list, POST as create } from "@/app/api/conversations/route";
import { GET as open, DELETE as remove } from "@/app/api/conversations/[id]/route";
import { chatRequest, fixtureResponse, providerChunk, streamEvents, TEST_KEY, TEST_MODEL, validChatBody } from "../provider-fixture";

const owned: string[] = [];
const database = () => getDatabase();
async function fresh() { const item = await createConversation(); owned.push(item.id); return item; }
function turn(id: string, version = 0, text = "Hello", userId = crypto.randomUUID(), regenerate = false) {
  return { conversationId: id, version, requestId: crypto.randomUUID(), user: { id: userId, content: text }, regenerate, model: TEST_MODEL, timeoutMs: 1000 };
}
beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", TEST_KEY); vi.stubEnv("OPENROUTER_MODEL_1", TEST_MODEL);
});
afterEach(async () => { await database().conversation.deleteMany({ where: { id: { in: owned.splice(0) } } }); });
afterAll(async () => { await database().$disconnect(); });

it("saves ordered turns, resumes exclusively from stored context, and exposes only safe metadata", async () => {
  const item = await fresh();
  const call = vi.fn<typeof fetch>(async (_url, init) => fixtureResponse([providerChunk({ content: "Saved answer" }), providerChunk({}, "stop")], init?.signal));
  vi.stubGlobal("fetch", call);
  for (const [version, text] of [[0, "First"], [2, "Second"]] as const) {
    const response = await chat(chatRequest({ ...validChatBody(), conversationId: item.id, version, requestId: crypto.randomUUID(), messages: [{ id: `user-${version}`, role: "user", parts: [{ type: "text", text }] }] }));
    const events = streamEvents(await response.text());
    expect(events.at(-1)).toMatchObject({ type: "finish", messageMetadata: { version: version + 2, status: "completed" } });
  }
  expect(JSON.parse(String(call.mock.calls[1][1]?.body)).messages).toEqual([
    { role: "user", content: "First" }, { role: "assistant", content: "Saved answer" }, { role: "user", content: "Second" },
  ]);
  const saved = await getConversation(item.id);
  expect(saved.messages.map((message) => message.sequence)).toEqual([0, 1, 2, 3]);
  expect(saved.messages.every((message) => message.status === "completed")).toBe(true);
  expect(saved.title).toBe("First");
  expect(JSON.stringify(saved)).not.toMatch(/requestId|activeRequestId|leaseExpiresAt|onk002-test-only-private-key/);
  const rows = await database().message.findMany({ where: { conversationId: item.id, role: "assistant" } });
  expect(rows.map((row) => row.metadata)).toEqual([{ finishReason: "stop" }, { finishReason: "stop" }]);
});
it("admits exactly one concurrent request and rejects replay before provider access", async () => {
  const item = await fresh(); const input = turn(item.id);
  const results = await Promise.allSettled([beginTurn(input), beginTurn({ ...input, requestId: crypto.randomUUID() })]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
  expect(await database().message.count({ where: { conversationId: item.id } })).toBe(2);
  await expect(beginTurn(input)).rejects.toMatchObject({ status: 409 });
});
it("regenerates in place with stable ids/order and prevents stale completion overwrites", async () => {
  const item = await fresh(); const input = turn(item.id);
  const original = await beginTurn(input); await finishTurn(original, "Partial", "stopped", "cancelled");
  const replacement = await beginTurn({ ...input, version: 2, requestId: crypto.randomUUID(), regenerate: true });
  expect(replacement.messageId).toBe(original.messageId);
  expect(replacement.messages).toEqual([{ role: "user", content: "Hello" }]);
  await expect(finishTurn(original, "Late old result", "completed", "stop")).rejects.toMatchObject({ status: 409 });
  await finishTurn(replacement, "Replacement", "completed", "stop");
  expect((await getConversation(item.id)).messages.map((message) => [message.sequence, message.content])).toEqual([[0, "Hello"], [1, "Replacement"]]);
});
it.each(["stopped", "failed"] as const)("preserves %s output and omits unfinished assistant context", async (status) => {
  const item = await fresh(); const first = await beginTurn(turn(item.id));
  await finishTurn(first, "Partial", status, status === "stopped" ? "cancelled" : "error");
  const saved = await getConversation(item.id); expect(saved.messages[1]).toMatchObject({ status, content: "Partial" });
  const next = await beginTurn(turn(item.id, 2, "Continue"));
  expect(next.messages.map((message) => message.content)).toEqual(["Hello", "Continue"]);
});
it("recovers abandoned leases and rejects the late request", async () => {
  const item = await fresh(); const first = await beginTurn(turn(item.id));
  await database().conversation.update({ where: { id: item.id }, data: { leaseExpiresAt: new Date(Date.now() - 1000) } });
  const saved = await getConversation(item.id);
  expect(saved).toMatchObject({ active: false, version: 2 });
  expect(saved.messages[1]).toMatchObject({ status: "failed", finishReason: "interrupted" });
  await expect(finishTurn(first, "Late", "completed", "stop")).rejects.toMatchObject({ status: 409 });
});
it("does not mark empty or filtered output as completed", async () => {
  const item = await fresh(); const first = await beginTurn(turn(item.id));
  await finishTurn(first, "", "completed", "stop");
  expect((await getConversation(item.id)).messages[1].status).toBe("failed");
});
it("bounds stored messages and server context before locking a turn", async () => {
  const item = await fresh(); const first = await beginTurn(turn(item.id));
  await finishTurn(first, "x".repeat(8001), "completed", "stop");
  await expect(beginTurn(turn(item.id, 2, "Next"))).rejects.toMatchObject({ status: 413 });
  expect((await getConversation(item.id)).version).toBe(2);
  await database().message.updateMany({ where: { conversationId: item.id, role: "assistant" }, data: { content: "OK" } });
  await database().message.createMany({ data: Array.from({ length: 30 }, (_, i) => ({ conversationId: item.id, clientId: crypto.randomUUID(), sequence: i + 2, role: "user" as const, content: "Hi", status: "completed" as const })) });
  await expect(beginTurn(turn(item.id, 2))).rejects.toMatchObject({ status: 413 });
});
it("paginates recent chats deterministically", async () => {
  const items = await Promise.all(Array.from({ length: 22 }, () => fresh()));
  const timestamp = new Date("2099-01-01T00:00:00Z");
  await database().conversation.updateMany({ where: { id: { in: items.map((item) => item.id) } }, data: { updatedAt: timestamp } });
  const page = await listConversations(); expect(page.conversations).toHaveLength(20);
  const second = await listConversations(page.nextCursor!);
  expect(new Set([...page.conversations, ...second.conversations].filter((row) => owned.includes(row.id)).map((row) => row.id)).size).toBe(22);
});
it("guards deletion by version/active state and cascades only the selected chat", async () => {
  const item = await fresh(); const other = await fresh(); const first = await beginTurn(turn(item.id));
  await expect(deleteConversation(item.id, 1)).rejects.toMatchObject({ status: 409 });
  await finishTurn(first, "Answer", "completed", "stop");
  await expect(deleteConversation(item.id, 0)).rejects.toMatchObject({ status: 409 });
  await deleteConversation(item.id, 2);
  expect(await database().message.count({ where: { conversationId: item.id } })).toBe(0);
  expect((await getConversation(other.id)).id).toBe(other.id);
  await expect(getConversation(item.id)).rejects.toMatchObject({ status: 404 });
});
it("implements create/list/open/delete HTTP contracts and rejects forged origins/versions", async () => {
  const response = await create(new Request("http://localhost/api/conversations", { method: "POST", headers: { "Content-Type": "application/json", Host: "127.0.0.1:33040", Origin: "http://127.0.0.1:33040" }, body: "{}" }));
  expect(response.status).toBe(201); const item = await response.json(); owned.push(item.id);
  const params = { params: Promise.resolve({ id: item.id }) };
  expect((await (await open(new Request("http://localhost"), params)).json()).messages).toEqual([]);
  expect((await list(new Request("http://localhost/api/conversations"))).headers.get("Cache-Control")).toBe("no-store");
  expect((await remove(new Request("http://localhost/api/conversations/x?version=0", { method: "DELETE", headers: { Origin: "https://evil.invalid" } }), params)).status).toBe(403);
  expect((await remove(new Request("http://localhost/api/conversations/x?version=1", { method: "DELETE" }), params)).status).toBe(409);
  expect((await remove(new Request("http://localhost/api/conversations/x?version=0", { method: "DELETE" }), params)).status).toBe(204);
});
