// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { test, expect, type Page } from "@playwright/test";

const models = { enabled: true, status: "ready", models: ["test/model-one", "test/model-two"].map((id) => ({ id, label: id })) };
const rich = '# A useful answer\n\n| Item | Value |\n| --- | --- |\n| Focus | 3 |\n\n- A short list\n\n```javascript\nconst answer = 42;\n```\n\nInline $x^2$\n\n$$\nE=mc^2\n$$\n\n```mermaid\nflowchart LR\nA[Question] --> B[Answer]\n```\n\n```vega-lite\n{"mark":"bar","data":{"values":[{"category":"A","amount":3},{"category":"B","amount":5}]},"encoding":{"x":{"field":"category","type":"nominal"},"y":{"field":"amount","type":"quantitative"}}}\n```';
const hostile = '<script>window.attacked=true</script>\n\n![tracking](https://private.invalid/pixel)\n\n[Attack](javascript:alert%281%29)\n\n$\\includegraphics{https://private.invalid/math}$\n\n```mermaid\n%%{init: {securityLevel: "loose"}}%%\nflowchart LR\nclick A "https://private.invalid"\n```\n\n```vega-lite\n{"mark":"bar","data":{"url":"https://private.invalid/data"}}\n```\n\n```mermaid\nflowchart LR\nA[unfinished\n```\n\nConversation survives.';
function stream(text: string, finish = true) {
  const events = [{ type: "start", messageId: "answer-" + crypto.randomUUID() }, { type: "start-step" },
    { type: "text-start", id: "text-0" }, { type: "text-delta", id: "text-0", delta: text },
    ...(finish ? [{ type: "text-end", id: "text-0" }, { type: "finish-step" }, { type: "finish", finishReason: "stop" }] : [])];
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + (finish ? 'data: [DONE]\n\n' : '');
}
async function safePage(page: Page) {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" && url.hostname !== "web") { external.push(url.href); await route.abort(); }
    else await route.fallback();
  });
  // Every chat request is intercepted before navigation; no provider request can escape these tests.
  await page.route("**/api/models", (route) => route.fulfill({ json: models }));
  return { errors, external };
}

test("model selection, keyboard send, rich rendering, copy, regenerate and new chat", async ({ page }) => {
  const observed = await safePage(page);
  const calls: Record<string, unknown>[] = [];
  await page.route("**/api/chat", async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({ contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" }, body: stream(rich) });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /A space to think/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
  await page.getByLabel("Model", { exact: true }).selectOption("test/model-two");
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Explain something");
  await page.getByRole("textbox", { name: "Message", exact: true }).press("Shift+Enter");
  await expect(page.getByRole("textbox")).toHaveValue("Explain something\n");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("heading", { name: "A useful answer" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator(".token.keyword").first()).toHaveText("const");
  await expect(page.locator(".katex")).toHaveCount(2);
  await expect(page.getByRole("img", { name: "Mermaid diagram" }).locator("svg")).toBeVisible();
  await expect(page.getByRole("img", { name: "Mermaid diagram" })).toContainText("Question");
  await expect(page.getByRole("img", { name: "Mermaid diagram" })).toContainText("Answer");
  await expect(page.getByRole("img", { name: "Vega-Lite chart" }).locator("svg")).toBeVisible();
  await page.getByRole("button", { name: "Copy code", exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("const answer = 42;");
  await page.getByRole("button", { name: "Copy message", exact: true }).last().click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(rich);
  expect(calls).toHaveLength(1);
  expect(calls[0].model).toBe("test/model-two");
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();
  await expect.poll(() => calls.length).toBe(2);
  await expect(page.locator(".assistant-message")).toHaveCount(1);
  await expect(page.locator(".user-message")).toHaveCount(1);
  expect((calls[1].messages as { role: string }[]).at(-1)?.role).toBe("user");
  await expect(page.getByRole("button", { name: "New chat" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `test-results/chat-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.locator(".message")).toHaveCount(0);
  expect(observed.errors).toEqual([]);
  expect(observed.external).toEqual([]);
});

test("safe failed response retains prompt and can regenerate without duplicate messages", async ({ page }) => {
  const observed = await safePage(page);
  let attempts = 0;
  await page.route("**/api/chat", (route) => {
    attempts++;
    return route.fulfill(attempts === 1 ? { status: 503, json: { error: { code: "ai_not_configured", message: "private-error-canary" } } }
      : { contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" }, body: stream("Recovered answer") });
  });
  await page.goto("/");
  await page.getByRole("textbox").fill("Keep this prompt");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".chat-error")).toContainText("Your messages are still here");
  await expect(page.locator("body")).not.toContainText("private-error-canary");
  await expect(page.locator(".user-message")).toContainText("Keep this prompt");
  expect(attempts).toBe(1);
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(page.locator(".assistant-message")).toContainText("Recovered answer");
  await expect(page.locator(".user-message")).toHaveCount(1);
  expect(attempts).toBe(2);
  expect(observed.errors).toEqual([]);
});

test("hostile graphics and Markdown stay inert and preserve other content", async ({ page }) => {
  const observed = await safePage(page);
  await page.route("**/api/chat", (route) => route.fulfill({ contentType: "text/event-stream", headers: { "x-vercel-ai-ui-message-stream": "v1" }, body: stream(hostile) }));
  await page.goto("/");
  await page.getByRole("textbox").fill("Show hostile fixtures");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".assistant-message")).toContainText("Conversation survives.");
  await expect(page.getByText(/Preview unavailable/)).toHaveCount(3);
  await expect(page.locator(".assistant-message img,.assistant-message iframe,.assistant-message a")).toHaveCount(0);
  expect(await page.evaluate(() => "attacked" in window)).toBe(false);
  expect(observed.external).toEqual([]);
  expect(observed.errors).toEqual([]);
});

test("disabled configuration explains setup and prevents sending", async ({ page }) => {
  await safePage(page);
  let calls = 0;
  await page.route("**/api/models", (route) => route.fulfill({ json: { enabled: false, status: "missing_api_key", models: [] } }));
  await page.route("**/api/chat", (route) => { calls++; return route.abort(); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Connect a model to begin" })).toBeVisible();
  await expect(page.getByRole("textbox")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
  await expect(page.getByLabel("Model", { exact: true })).toBeDisabled();
  expect(calls).toBe(0);
});

test("Stop aborts the stream, retains partial output and permits explicit regeneration", async ({ page }) => {
  const observed = await safePage(page);
  await page.route("**/api/chat", (route) => route.abort());
  await page.addInitScript(({ partial, complete }) => {
    const original = window.fetch;
    let attempts = 0;
    Object.defineProperty(window, "streamWasAborted", { configurable: true, writable: true, value: false });
    window.fetch = async (input, init) => {
      if (String(input).endsWith("/api/chat")) {
        attempts++;
        return new Response(new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(attempts === 1 ? partial : complete));
            if (attempts > 1) controller.close();
            else init?.signal?.addEventListener("abort", () => {
              Object.defineProperty(window, "streamWasAborted", { value: true });
              controller.error(new DOMException("Stopped", "AbortError"));
            }, { once: true });
          },
        }), { headers: { "Content-Type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } });
      }
      return original(input, init);
    };
  }, { partial: stream("Partial response", false), complete: stream("Regenerated response") });
  await page.goto("/");
  await page.getByRole("textbox").fill("A prompt to keep");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".assistant-message")).toContainText("Partial response");
  await expect(page.getByLabel("Model", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Object.getOwnPropertyDescriptor(window, "streamWasAborted")?.value)).toBe(true);
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  await expect(page.locator(".assistant-message")).toContainText("Partial response");
  await expect(page.locator(".user-message")).toContainText("A prompt to keep");
  await expect(page.locator(".assistant-message")).toContainText("Response stopped or incomplete.");
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(page.locator(".assistant-message")).toContainText("Regenerated response");
  await expect(page.locator(".user-message")).toHaveCount(1);
  await expect(page.locator(".assistant-message")).toHaveCount(1);
  expect(observed.errors).toEqual([]);
});

test("registry failure is actionable and retry recovers without a chat request", async ({ page }) => {
  const observed = await safePage(page);
  let loads = 0;
  let calls = 0;
  await page.route("**/api/models", (route) => {
    loads++;
    return route.fulfill(loads === 1 ? { status: 500, body: "not JSON" } : { json: models });
  });
  await page.route("**/api/chat", (route) => { calls++; return route.abort(); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Models could not be loaded" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByLabel("Model", { exact: true })).toBeEnabled();
  expect(calls).toBe(0);
  expect(observed.errors).toEqual([]);
});
