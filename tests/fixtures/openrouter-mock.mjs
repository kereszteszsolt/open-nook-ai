// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

if (process.env.OPENNOOK_TEST_PROVIDER !== "1" || process.env.OPENROUTER_API_KEY !== "onk004-test-only-key"
  || !/^\/open_nook_test[A-Za-z0-9_]*$/.test(new URL(process.env.DATABASE_URL).pathname)) {
  throw new Error("The mock provider requires explicit test settings and an isolated test database.");
}
const encoder = new TextEncoder();
globalThis.fetch = async (input, init) => {
  if (String(input) !== "https://openrouter.ai/api/v1/chat/completions") throw new Error("External network is disabled in provider fixtures.");
  const body = JSON.parse(String(init?.body));
  if (body.model !== "test/model-one") throw new Error("Unexpected fixture model");
  const prompt = body.messages.at(-1).content;
  if (prompt.includes("[failure]")) return new Response('{"error":{"message":"private-fixture-error"}}', { status: 503 });
  const hold = prompt.includes("[stop]");
  const content = hold ? "Partial fixture response" : `Saved fixture answer: ${prompt}`;
  let controller;
  let active = true;
  const abort = () => { if (active) { active = false; controller.error(new DOMException("Stopped", "AbortError")); } };
  const chunk = (delta, finish_reason = null) => ({ id: "fixture", model: body.model, object: "chat.completion.chunk", created: 1, choices: [{ index: 0, delta, finish_reason }] });
  const stream = new ReadableStream({
    start(target) {
      controller = target;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk({ role: "assistant", content }))}\n\n`));
      if (hold) { init?.signal?.addEventListener("abort", abort, { once: true }); if (init?.signal?.aborted) abort(); }
      else {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk({}, "stop"))}\n\ndata: [DONE]\n\n`));
        active = false; controller.close();
      }
    },
    cancel() { active = false; init?.signal?.removeEventListener("abort", abort); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
};
