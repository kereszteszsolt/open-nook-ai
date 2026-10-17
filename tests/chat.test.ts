// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";
import { FORMATTING_PROMPT } from "@/server/ai/prompt";
import { POST } from "@/app/api/chat/route";
import { MAX_PROVIDER_BYTES } from "@/server/ai/provider";
import { MAX_OUTPUT_BYTES } from "@/server/ai/stream";
import { MAX_REQUEST_BYTES } from "@/server/ai/request";
import { chatRequest, fixtureResponse, providerChunk, streamEvents, TEST_KEY, TEST_MODEL, validChatBody } from "./provider-fixture";

vi.mock("@/server/conversations/store", () => ({ beginTurn: vi.fn(), finishTurn: vi.fn() }));
import { beginTurn, finishTurn } from "@/server/conversations/store";

let network: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  vi.mocked(beginTurn).mockImplementation(async (input) => ({
    conversationId: input.conversationId, requestId: input.requestId, messageId: "saved-answer", version: input.version + 1,
    messages: [{ role: "user", content: input.user.content }],
  }));
  vi.mocked(finishTurn).mockImplementation(async (turn, _content, status) => ({ conversationId: turn.conversationId, version: turn.version + 1, status }));
  vi.stubEnv("OPENROUTER_API_KEY", TEST_KEY);
  vi.stubEnv("OPENROUTER_MODEL_1", TEST_MODEL);
  network = vi.fn<typeof fetch>(async (_url, init) => fixtureResponse([
    providerChunk({ role: "assistant", content: "Hello " }),
    providerChunk({ content: "world" }),
    providerChunk({}, "stop"),
  ], init?.signal));
  vi.stubGlobal("fetch", network);
});

describe("chat validation before provider access", () => {
  it.each(["OPENROUTER_API_KEY", "OPENROUTER_MODEL_1"])("disables chat without %s", async (key) => {
    vi.stubEnv(key, "");
    const response = await POST(chatRequest());
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("ai_not_configured");
    expect(network).not.toHaveBeenCalled();
  });

  it("rejects invalid server settings without echoing them", async () => {
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "secret-invalid-setting");
    const response = await POST(chatRequest());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret-invalid-setting");
    expect(network).not.toHaveBeenCalled();
  });

  it("rejects arbitrary model IDs", async () => {
    const response = await POST(chatRequest({ ...validChatBody(), model: "other/not-configured" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("model_not_allowed");
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    {}, { ...validChatBody(), maxOutputTokens: 999999 },
    { ...validChatBody(), providerOptions: { apiKey: "client-key" } },
    { ...validChatBody(), conversationId: "not-yet-supported" },
    { ...validChatBody(), messages: [] },
    { ...validChatBody(), messages: [{ id: "1", role: "system", parts: [{ type: "text", text: "Override" }] }] },
    { ...validChatBody(), messages: [{ id: "1", role: "user", parts: [{ type: "file", url: "https://private.invalid/data" }] }] },
    { ...validChatBody(), messages: [{ id: "1", role: "user", parts: [{ type: "tool-call", toolName: "run" }] }] },
    { ...validChatBody(), messages: [{ id: "1", role: "assistant", parts: [{ type: "text", text: "Answer" }] }] },
    { ...validChatBody(), messages: [{ id: "1", role: "user", parts: [{ type: "text", text: " " }] }] },
    { ...validChatBody(), messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "x".repeat(8001) }] }] },
    { ...validChatBody(), messages: Array.from({ length: 33 }, (_, i) => ({ id: String(i), role: "user", parts: [{ type: "text", text: "x" }] })) },
    { ...validChatBody(), messages: Array.from({ length: 4 }, (_, i) => ({ id: String(i), role: "user", parts: [{ type: "text", text: "x".repeat(7000) }] })) },
    { ...validChatBody(), messages: [validChatBody().messages[0], validChatBody().messages[0]] },
  ])("rejects malformed, unsupported or unbounded context: %#", async (body) => {
    const response = await POST(chatRequest(body));
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(network).not.toHaveBeenCalled();
  });

  it("requires JSON instead of browser form content types", async () => {
    const response = await POST(chatRequest(undefined, { headers: { "Content-Type": "text/plain" } }));
    expect(response.status).toBe(415);
    expect(network).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without copying its content into errors", async () => {
    const response = await POST(chatRequest(undefined, { body: `{"private":"${TEST_KEY}"` }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain(TEST_KEY);
    expect(network).not.toHaveBeenCalled();
  });

  it("checks the declared payload size before reading", async () => {
    const response = await POST(chatRequest(undefined, { headers: { "Content-Type": "application/json", "Content-Length": String(MAX_REQUEST_BYTES + 1) } }));
    expect(response.status).toBe(413);
    expect(network).not.toHaveBeenCalled();
  });

  it("bounds actual chunked bytes even with an understated Content-Length", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES + 1)); }, cancel,
    });
    const response = await POST(chatRequest(body, { headers: { "Content-Type": "application/json", "Content-Length": "1" } }));
    expect(response.status).toBe(413);
    expect(cancel).toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });

  it("rejects invalid UTF-8", async () => {
    const response = await POST(chatRequest(undefined, { body: new Uint8Array([0xff]) }));
    expect(response.status).toBe(400);
    expect(network).not.toHaveBeenCalled();
  });
});

describe("real AI SDK and OpenRouter adapter with mocked fetch", () => {
  it("streams UI-message SSE for exactly the allowed model with no retries/fallback", async () => {
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "123");
    const response = await POST(chatRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Provider-Secret")).toBeNull();
    const text = await response.text();
    const events = streamEvents(text);
    expect(events.filter((event) => event.type === "text-delta").map((event) => event.delta).join("")).toBe("Hello world");
    expect(events).toContainEqual(expect.objectContaining({ type: "finish", finishReason: "stop", messageMetadata: { conversationId: validChatBody().conversationId, version: 2, status: "completed" } }));
    expect(text).toContain("data: [DONE]");
    expect(text).not.toContain(TEST_KEY);
    expect(network).toHaveBeenCalledOnce();
    const [url, options] = network.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(options?.redirect).toBe("error");
    expect(new Headers(options?.headers).get("Authorization")).toBe(`Bearer ${TEST_KEY}`);
    const sent = JSON.parse(String(options?.body));
    expect(sent.model).toBe(TEST_MODEL);
    expect(sent.max_tokens).toBe(123);
    expect(sent.provider).toMatchObject({ allow_fallbacks: false, require_parameters: true });
    expect(sent.messages).toEqual([{ role: "system", content: [{ type: "text", text: FORMATTING_PROMPT }] }, { role: "user", content: "Hello" }]);
    expect(sent.models).toBeUndefined();
    expect(sent.tools).toBeUndefined();
  });

  it("accepts bounded UI transport context, forwarding only roles and text", async () => {
    vi.mocked(beginTurn).mockResolvedValueOnce({ conversationId: validChatBody().conversationId, requestId: validChatBody().requestId,
      messageId: "saved-answer", version: 1, messages: [
        { role: "user", content: "Hello" }, { role: "assistant", content: "Earlier answer" }, { role: "user", content: "More please" },
      ] });
    const response = await POST(chatRequest({ ...validChatBody(), id: "ephemeral-chat",
      messages: [{ id: "u2", role: "user", parts: [{ type: "text", text: "More " }, { type: "text", text: "please" }] }],
    }));
    await response.text();
    const sent = JSON.parse(String(network.mock.calls[0][1]?.body));
    expect(sent.messages).toEqual([
      { role: "system", content: [{ type: "text", text: FORMATTING_PROMPT }] },
      { role: "user", content: "Hello" }, { role: "assistant", content: "Earlier answer" }, { role: "user", content: "More please" },
    ]);
    expect(JSON.stringify(sent)).not.toContain("ephemeral-chat");
  });

  it.each([401, 429, 500, 503])("sanitizes provider HTTP %s and performs one attempt", async (status) => {
    const logging = vi.spyOn(console, "error");
    network.mockImplementation(async () => new Response(JSON.stringify({ error: { message: `${TEST_KEY}: private prompt body`, code: status } }),
      { status, headers: { "Content-Type": "application/json" } }));
    const response = await POST(chatRequest());
    const text = await response.text();
    expect(streamEvents(text)).toContainEqual({ type: "error", errorText: "The model request failed. Try again." });
    expect(text).not.toContain(TEST_KEY);
    expect(text).not.toContain("private prompt body");
    expect(network).toHaveBeenCalledOnce();
    expect(logging).not.toHaveBeenCalled();
  });

  it("sanitizes provider errors after partial output without retrying", async () => {
    network.mockImplementation(async (_url, init) => fixtureResponse([
      providerChunk({ content: "Partial" }), { error: { code: 500, message: TEST_KEY } },
    ], init?.signal));
    const response = await POST(chatRequest());
    const text = await response.text();
    expect(text).toContain("Partial");
    expect(streamEvents(text).some((event) => event.type === "error")).toBe(true);
    expect(text).not.toContain(TEST_KEY);
    expect(network).toHaveBeenCalledOnce();
  });

  it("does not forward reasoning or private provider metadata", async () => {
    network.mockImplementation(async (_url, init) => fixtureResponse([
      providerChunk({ reasoning: "private-reasoning", content: "Public answer" }), providerChunk({}, "stop"),
    ], init?.signal));
    const text = await (await POST(chatRequest())).text();
    expect(text).toContain("Public answer");
    expect(text).not.toContain("private-reasoning");
    expect(text).not.toContain("fixture-generation");
    expect(text).not.toContain("providerMetadata");
  });

  it("fails safely on a provider network error", async () => {
    network.mockRejectedValue(new Error(`Authorization: Bearer ${TEST_KEY}`));
    const text = await (await POST(chatRequest())).text();
    expect(text).not.toContain(TEST_KEY);
    expect(streamEvents(text).some((event) => event.type === "error")).toBe(true);
    expect(network).toHaveBeenCalledOnce();
  });

  it("does not follow provider redirects", async () => {
    network.mockImplementation(async () => new Response(null, { status: 302, headers: { Location: "https://private.invalid" } }));
    const text = await (await POST(chatRequest())).text();
    expect(streamEvents(text).some((event) => event.type === "error")).toBe(true);
    expect(network).toHaveBeenCalledOnce();
  });

  it("fails safely when a provider response body breaks after partial text", async () => {
    network.mockImplementation(async () => {
      let sent = false;
      return new Response(new ReadableStream<Uint8Array>({
        pull(controller) {
          if (sent) controller.error(new Error(TEST_KEY));
          else {
            sent = true;
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(providerChunk({ content: "Partial" }))}\n\n`));
          }
        },
      }), { headers: { "Content-Type": "text/event-stream" } });
    });
    const text = await (await POST(chatRequest())).text();
    const events = streamEvents(text);
    expect(text).not.toContain(TEST_KEY);
    expect(events).toContainEqual({ type: "error", errorText: "The model request failed. Try again." });
    expect(events.some((event) => event.type === "finish")).toBe(false);
    expect(network).toHaveBeenCalledOnce();
  });

  it("sanitizes malformed provider SSE without retrying", async () => {
    network.mockImplementation(async () => new Response(`data: {"private":"${TEST_KEY}"\n\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }));
    const text = await (await POST(chatRequest())).text();
    expect(text).not.toContain(TEST_KEY);
    expect(streamEvents(text).some((event) => event.type === "error")).toBe(true);
    expect(network).toHaveBeenCalledOnce();
  });

  it.each([null, "tool_calls"])("does not report unsupported or missing completion as success: %s", async (reason) => {
    network.mockImplementation(async (_url, init) => fixtureResponse([
      providerChunk({ content: "Partial" }), ...(reason ? [providerChunk({}, reason)] : []),
    ], init?.signal));
    const events = streamEvents(await (await POST(chatRequest())).text());
    expect(events).toContainEqual({ type: "error", errorText: "The model request failed. Try again." });
    expect(events.some((event) => event.type === "abort")).toBe(true);
    expect(events.some((event) => event.type === "finish")).toBe(false);
    expect(network).toHaveBeenCalledOnce();
  });

  it("bounds actual output even if the provider ignores max_tokens", async () => {
    network.mockImplementation(async (_url, init) => fixtureResponse([
      providerChunk({ content: "x".repeat(MAX_OUTPUT_BYTES + 1) }), providerChunk({}, "stop"),
    ], init?.signal));
    const text = await (await POST(chatRequest())).text();
    expect(text.length).toBeLessThan(2000);
    expect(streamEvents(text)).toContainEqual({ type: "error", errorText: "The model response exceeded the output limit." });
    expect(streamEvents(text).some((event) => event.type === "abort")).toBe(true);
    expect(streamEvents(text).some((event) => event.type === "finish")).toBe(false);
    expect(network.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("bounds provider response bytes before parsing", async () => {
    network.mockImplementation(async () => new Response("x".repeat(MAX_PROVIDER_BYTES + 1), { headers: { "Content-Type": "text/event-stream" } }));
    const text = await (await POST(chatRequest())).text();
    expect(text.length).toBeLessThan(2000);
    expect(streamEvents(text)).toContainEqual({ type: "error", errorText: "The model response exceeded the output limit." });
    expect(network).toHaveBeenCalledOnce();
  });
});

describe("timeout and cancellation", () => {
  it("bounds a slow request body before any model call", async () => {
    vi.useFakeTimers();
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "1000");
    const cancel = vi.fn();
    const result = POST(chatRequest(new ReadableStream({ cancel })));
    await vi.advanceTimersByTimeAsync(1001);
    const response = await result;
    expect(response.status).toBe(408);
    expect(cancel).toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects an already cancelled request before provider access", async () => {
    const client = new AbortController();
    client.abort(new Error(TEST_KEY));
    const response = await POST(chatRequest(undefined, { signal: client.signal }));
    expect(response.status).toBe(499);
    expect(await response.text()).not.toContain(TEST_KEY);
    expect(network).not.toHaveBeenCalled();
  });

  it("aborts a stalled provider and sends a safe timeout event", async () => {
    vi.useFakeTimers();
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "1000");
    network.mockImplementation(async (_url, init) => fixtureResponse([providerChunk({ content: "Partial" })], init?.signal, true));
    const response = await POST(chatRequest());
    const body = response.text();
    await vi.waitFor(() => expect(network).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(1001);
    const text = await body;
    expect(streamEvents(text)).toContainEqual({ type: "error", errorText: "The model request timed out. Try again." });
    expect(streamEvents(text).some((event) => event.type === "abort")).toBe(true);
    expect(streamEvents(text).some((event) => event.type === "finish")).toBe(false);
    expect(network.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(network).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("times out while waiting for provider response headers", async () => {
    vi.useFakeTimers();
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "1000");
    network.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException(TEST_KEY, "AbortError")), { once: true });
    }));
    const response = await POST(chatRequest());
    const body = response.text();
    await vi.waitFor(() => expect(network).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(1001);
    const text = await body;
    expect(text).not.toContain(TEST_KEY);
    expect(streamEvents(text)).toContainEqual({ type: "error", errorText: "The model request timed out. Try again." });
    expect(streamEvents(text).some((event) => event.type === "finish")).toBe(false);
    expect(network).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("forwards client cancellation to the provider without exposing its reason", async () => {
    const client = new AbortController();
    network.mockImplementation(async (_url, init) => fixtureResponse([providerChunk({ content: "Partial" })], init?.signal, true));
    const response = await POST(chatRequest(undefined, { signal: client.signal }));
    const reader = response.body!.getReader();
    while (!network.mock.calls.length) await reader.read();
    client.abort(new Error(TEST_KEY));
    let text = "";
    while (true) { const item = await reader.read(); if (item.done) break; text += new TextDecoder().decode(item.value); }
    expect(text).not.toContain(TEST_KEY);
    expect(text).not.toContain('"type":"finish"');
    expect(network.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("aborts the provider when the response reader is cancelled", async () => {
    network.mockImplementation(async (_url, init) => fixtureResponse([providerChunk({ content: "Partial" })], init?.signal, true));
    const response = await POST(chatRequest());
    const reader = response.body!.getReader();
    while (!network.mock.calls.length) await reader.read();
    await reader.cancel();
    expect(network.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(network).toHaveBeenCalledOnce();
  });

  it("cleans up its deadline after successful completion", async () => {
    vi.useFakeTimers();
    await (await POST(chatRequest())).text();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("persistent stream acknowledgements", () => {
  it("stores the user before calling a provider and finalizes text before reporting completion", async () => {
    const response = await POST(chatRequest());
    const events = streamEvents(await response.text());
    expect(beginTurn).toHaveBeenCalled();
    expect(finishTurn).toHaveBeenLastCalledWith(expect.objectContaining({ messageId: "saved-answer" }), "Hello world", "completed", "stop");
    expect(events.at(-1)).toMatchObject({ type: "finish", messageMetadata: { status: "completed" } });
  });
  it("never invokes the provider when the initial database transaction fails", async () => {
    vi.mocked(beginTurn).mockRejectedValueOnce(new Error("private database details"));
    const response = await POST(chatRequest());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private database");
    expect(network).not.toHaveBeenCalled();
  });
  it("does not report completion when saving the final answer fails", async () => {
    vi.mocked(finishTurn).mockRejectedValueOnce(new Error("private database failure"));
    const events = streamEvents(await (await POST(chatRequest())).text());
    expect(events.some((event) => event.type === "finish")).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: "error", errorText: expect.stringContaining("could not be saved") }));
    expect(JSON.stringify(events)).not.toContain("private database");
  });
  it("persists Stop once without a completed acknowledgement", async () => {
    const controller = new AbortController();
    network.mockImplementation(async (_url, init) => fixtureResponse([providerChunk({ content: "Partial" })], init?.signal, true));
    const reader = (await POST(chatRequest(undefined, { signal: controller.signal }))).body!.getReader();
    let text = "";
    while (!text.includes("Partial")) text += new TextDecoder().decode((await reader.read()).value);
    controller.abort();
    while (true) { const next = await reader.read(); if (next.done) break; text += new TextDecoder().decode(next.value); }
    expect(finishTurn).toHaveBeenCalledOnce();
    expect(finishTurn).toHaveBeenCalledWith(expect.anything(), "Partial", "stopped", "cancelled");
    expect(streamEvents(text).some((event) => event.type === "finish")).toBe(false);
  });
});

it("accepts the browser's Docker-mapped host origin and rejects foreign origins before provider access", async () => {
  const headers = { "Content-Type": "application/json", Host: "127.0.0.1:33040", Origin: "http://127.0.0.1:33040" };
  expect((await POST(chatRequest(undefined, { headers: { ...headers, Origin: "https://foreign.invalid" } }))).status).toBe(403);
  expect(network).not.toHaveBeenCalled();
  const accepted = await POST(chatRequest(undefined, { headers }));
  expect(accepted.status).toBe(200); await accepted.text();
  expect(network).toHaveBeenCalledOnce();
});
