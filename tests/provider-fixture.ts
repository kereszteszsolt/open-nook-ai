// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

export const TEST_KEY = "onk002-test-only-private-key";
export const TEST_MODEL = "test/model-one";
const encoder = new TextEncoder();

export function providerChunk(delta: Record<string, unknown>, finishReason: string | null = null) {
  return {
    id: "fixture-generation", object: "chat.completion.chunk", created: 1, model: TEST_MODEL,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
    ...(finishReason ? { usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 } } : {}),
  };
}

export function fixtureResponse(chunks: unknown[], signal?: AbortSignal | null, holdOpen = false) {
  let active = true;
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  const onAbort = () => {
    if (!active) return;
    active = false;
    streamController.error(new DOMException("Fixture aborted", "AbortError"));
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
      for (const chunk of chunks) controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      if (holdOpen) signal?.addEventListener("abort", onAbort, { once: true });
      else {
        active = false;
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
    cancel() {
      active = false;
      signal?.removeEventListener("abort", onAbort);
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "X-Provider-Secret": TEST_KEY } });
}

export function validChatBody() {
  return { model: TEST_MODEL, conversationId: "00000000-0000-4000-8000-000000000001", version: 0, requestId: "00000000-0000-4000-8000-000000000002", messages: [{ id: "user-1", role: "user", parts: [{ type: "text", text: "Hello" }] }] };
}

export function chatRequest(body: unknown = validChatBody(), options: RequestInit = {}) {
  const init = {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: body instanceof ReadableStream ? body : JSON.stringify(body), duplex: "half", ...options,
  };
  return new Request("http://localhost/api/chat", init);
}

export function streamEvents(text: string) {
  return text.split("\n").filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
}
