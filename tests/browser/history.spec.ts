// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { streamingFixtures } from "../fixtures/streaming";
import { test, expect, type Page } from "@playwright/test";

test.skip(process.env.E2E_PERSISTENCE !== "1", "Requires the guarded mock provider and an isolated test database.");
async function history(page: Page) {
  if (test.info().project.name.includes("mobile")) await page.getByRole("button", { name: "History", exact: true }).click();
}
async function send(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Message", exact: true }).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
}
async function snapshot(page: Page) {
  const id = new URL(page.url()).searchParams.get("conversation")!;
  const response = await page.request.get(`/api/conversations/${id}`);
  expect(response.ok()).toBe(true);
  return response.json();
}
async function cleanup(page: Page) {
  const saved = await snapshot(page);
  expect((await page.request.delete(`/api/conversations/${saved.id}?version=${saved.version}`)).status()).toBe(204);
}

test("create, reload, resume, copy, reopen and delete a saved conversation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const prompt = `History journey ${test.info().project.name} ${crypto.randomUUID()}`;
  await page.goto("/"); await send(page, prompt);
  await expect(page.locator(".assistant-message")).toContainText(`Saved fixture answer: ${prompt}`);
  await expect(page.getByText("Saved on this device", { exact: true })).toHaveCount(1);
  const before = await snapshot(page);
  expect(before.messages.map((message: { status: string }) => message.status)).toEqual(["completed", "completed"]);
  await page.reload();
  await expect(page.locator(".user-message")).toHaveCount(1);
  await expect(page.locator(".assistant-message")).toHaveCount(1);
  await page.locator(".assistant-message").getByRole("button", { name: "Copy message" }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`Saved fixture answer: ${prompt}`);
  await send(page, "Continue the saved chat");
  await expect(page.locator(".assistant-message")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "New chat" })).toBeEnabled();
  const resumed = await snapshot(page);
  expect(resumed.messages.map((message: { sequence: number }) => message.sequence)).toEqual([0, 1, 2, 3]);
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.locator(".message")).toHaveCount(0);
  await history(page);
  await page.getByRole("button", { name: prompt, exact: true }).click();
  await expect(page.locator(".assistant-message")).toHaveCount(2);
  await history(page);
  page.once("dialog", (dialog) => { void dialog.accept(); });
  await page.getByRole("button", { name: `Delete ${prompt}`, exact: true }).click();
  await expect(page.locator(".message")).toHaveCount(0);
  expect((await page.request.get(`/api/conversations/${before.id}`)).status()).toBe(404);
  expect(errors).toEqual([]);
});

test("Stop and regenerate keep one turn and persist an explicit unfinished state", async ({ page }) => {
  await page.goto("/"); await send(page, "[stop] Keep this prompt");
  await expect(page.locator(".assistant-message")).toContainText("Partial fixture response");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeEnabled();
  const stopped = await snapshot(page);
  expect(stopped.messages[1]).toMatchObject({ status: "stopped", content: "Partial fixture response" });
  await page.reload();
  await expect(page.locator(".assistant-message")).toContainText("Response stopped or incomplete.");
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(page.locator(".assistant-message")).toContainText("Partial fixture response");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeEnabled();
  const regenerated = await snapshot(page);
  expect(regenerated.messages.map((message: { id: string }) => message.id)).toEqual(stopped.messages.map((message: { id: string }) => message.id));
  expect(regenerated.messages).toHaveLength(2);
  await cleanup(page);
});

test("provider errors survive reload without becoming completed or duplicating regenerated turns", async ({ page }) => {
  await page.goto("/"); await send(page, "[failure] Keep my question");
  await expect(page.locator(".chat-error")).toBeVisible();
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeEnabled();
  const saved = await snapshot(page);
  expect(saved.messages[1].status).toBe("failed");
  await page.reload();
  await expect(page.locator(".assistant-message")).toContainText("Response failed.");
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(page.locator(".chat-error")).toBeVisible();
  await expect(page.getByRole("button", { name: "Regenerate" })).toBeEnabled();
  expect((await snapshot(page)).messages).toHaveLength(2);
  await cleanup(page);
});


for (const kind of ["math", "code", "mermaid", "chart"] as const) {
  test(`live ${kind} preview precedes stream completion and persists only original text`, async ({ page }) => {
    const errors: string[] = [], external: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      if (new URL(route.request().url()).hostname !== "127.0.0.1") { external.push(route.request().url()); await route.abort(); }
      else await route.continue();
    });
    await page.goto("/"); await send(page, `[preview-${kind}] live rendering`);
    await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
    const answer = page.locator(".assistant-message");
    if (kind === "math") await expect(answer.locator(".katex")).toHaveCount(1);
    else if (kind === "code") await expect(answer.locator(".token.keyword")).toHaveText("const");
    else {
      await expect(answer.getByRole("img", { name: kind === "mermaid" ? "Mermaid diagram" : "Vega-Lite chart" }).locator("svg")).toBeVisible();
      if (kind === "mermaid") await expect(answer.getByRole("img", { name: "Mermaid diagram" })).toContainText("Answer");
    }
    expect((await snapshot(page)).messages[1]).toMatchObject({ status: "pending", content: "" });
    await expect.poll(async () => {
      await answer.getByRole("button", { name: "Copy message" }).click();
      return page.evaluate(() => navigator.clipboard.readText());
    }).toBe(streamingFixtures[kind]);
    await page.screenshot({ path: `test-results/live-${kind}-${test.info().project.name}.png` });
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(page.getByRole("button", { name: "Regenerate" })).toBeEnabled();
    const stopped = await snapshot(page);
    expect(stopped.messages[1]).toMatchObject({ status: "stopped", content: streamingFixtures[kind] });
    await page.reload();
    await expect(page.locator(".assistant-message")).toContainText("Response stopped or incomplete.");
    if (kind === "math") await expect(page.locator(".assistant-message .katex")).toHaveCount(0);
    await page.locator(".assistant-message").getByRole("button", { name: "Copy message" }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(streamingFixtures[kind]);
    expect(errors).toEqual([]); expect(external).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await cleanup(page);
  });
}

test("reload and switching conversations preserve the correct provider context", async ({ page }) => {
  const anchor = `Context anchor ${crypto.randomUUID()}`;
  await page.goto("/"); await send(page, anchor);
  await expect(page.locator(".history-toolbar").getByRole("button", { name: "New chat", exact: true })).toBeEnabled();
  const first = await snapshot(page);
  await page.locator(".history-toolbar").getByRole("button", { name: "New chat", exact: true }).click();
  await send(page, "Other isolated conversation");
  await expect(page.locator(".history-toolbar").getByRole("button", { name: "New chat", exact: true })).toBeEnabled();
  const other = await snapshot(page);
  await history(page);
  await page.getByRole("button", { name: anchor, exact: true }).click();
  await expect(page).toHaveURL(new RegExp("conversation=" + first.id));
  await page.reload();
  await expect(page.locator(".assistant-message")).toContainText(`Saved fixture answer: ${anchor}`);
  await send(page, "[context-check] Recall the earlier exchange");
  await expect(page.locator(".assistant-message").last()).toContainText(`Context retained: ${anchor}`);
  await expect(page.locator(".history-toolbar").getByRole("button", { name: "New chat", exact: true })).toBeEnabled();
  expect((await snapshot(page)).id).toBe(first.id);
  await expect(page.locator(".messages")).not.toContainText("Other isolated conversation");
  await cleanup(page);
  expect((await page.request.delete(`/api/conversations/${other.id}?version=${other.version}`)).status()).toBe(204);
});
