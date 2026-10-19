// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { test, expect, type Page } from "@playwright/test";
import appMetadata from "../../brand/branding.json" with { type: "json" };

const appInfo = { ...appMetadata, favicon: `/app-assets/${appMetadata.appFavicon}` };

async function appPage(page: Page, count = 0, configuredModels = [{ id: "fixture/one", label: "Fixture model one" }, { id: "fixture/two", label: "Fixture model two" }]) {
  const errors: string[] = [];
  const unexpected: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(test.info().project.use.baseURL!).origin || request.method() !== "GET" || url.pathname === "/api/chat") {
      unexpected.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    }
    return route.fallback();
  });
  await page.route("**/api/models", (route) => route.fulfill({ json: {
    enabled: true, status: "ready", models: configuredModels,
  } }));
  await page.route("**/api/conversations**", (route) => route.fulfill({ json: {
    conversations: Array.from({ length: count }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      title: `Synthetic conversation ${index + 1} with a longer saved title`, version: 0, active: false,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    })), nextCursor: null,
  } }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "New chat", exact: true })).toBeEnabled();
  return { errors, unexpected };
}

test("header branding, model selection and accessible About use the app's own metadata", async ({ page }) => {
  const observed = await appPage(page);
  const header = page.locator(".app-header");
  await expect(header).toContainText(appInfo.appName);
  await expect.poll(() => header.locator(".wordmark img").evaluate((element) => (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(page).toHaveTitle(appInfo.appName);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", appInfo.favicon);
  await page.getByRole("combobox", { name: "Model", exact: true }).click();
  await page.getByRole("option", { name: "Fixture model two", exact: true }).click();
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Keep this unsent draft");
  const about = page.getByRole("button", { name: "About", exact: true });
  await expect(about.locator("svg")).toHaveCount(0);
  await expect(about).toHaveCSS("font-weight", "600");
  await expect(page.getByText("History is saved on this device", { exact: true })).toHaveCount(0);
  await expect(page.locator(".session-status")).toHaveCount(0);
  await about.click();
  const dialog = page.getByRole("dialog", { name: `About ${appInfo.appName}` });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.getByRole("img", { name: `${appInfo.appName} project poster` }).evaluate((element) => (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(dialog.locator(".about-description")).toHaveText(appInfo.appDescription);
  await expect(dialog).toContainText(appInfo.supportRemarkText);
  await expect(dialog.getByRole("link", { name: "Source" })).toHaveAttribute("href", appInfo.appGithubUrl);
  await expect(dialog.getByRole("link", { name: "GitHub profile" })).toHaveAttribute("href", appInfo.authorGithub);
  await expect(dialog.locator(".copyright-line")).toHaveText(`© ${new Date().getFullYear()} ${appInfo.authorName}, Apache-2.0`);
  await page.screenshot({ path: `test-results/about-${test.info().project.name}.png`, fullPage: true });
  const website = dialog.getByRole("link", { name: "kereszteszsolt.hu" });
  await website.focus();
  await expect(website.getByRole("tooltip")).toContainText("hu | en | ro | de");
  await expect(website.getByRole("tooltip")).toContainText(appInfo.authorWebsite);
  const support = dialog.getByRole("link", { name: "Ways to support" });
  await support.focus();
  await expect(support.getByRole("tooltip")).toContainText(appInfo.authorWaysToSupportUrl);
  const tooltip = await support.getByRole("tooltip").boundingBox();
  expect(tooltip!.x).toBeGreaterThanOrEqual(0);
  expect(tooltip!.x + tooltip!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(about).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue("Keep this unsent draft");
  await expect(page.getByRole("combobox", { name: "Model", exact: true })).toHaveText("Fixture model two");
  await about.click();
  await page.mouse.click(1, 1);
  await expect(dialog).not.toBeVisible();
  await about.click();
  await dialog.getByRole("button", { name: "Close about" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue("");
  expect(observed.errors).toEqual([]);
  expect(observed.unexpected).toEqual([]);
});

test("sidebar attribution stays visible below a scrolling conversation history", async ({ page }) => {
  const observed = await appPage(page, 20);
  if (page.viewportSize()!.width <= 800) await page.getByRole("button", { name: "History", exact: true }).click();
  const sidebar = page.getByRole("complementary", { name: "Saved chats" });
  const footer = sidebar.locator("footer");
  await expect(footer.locator(".copyright-line")).toHaveText(`© ${new Date().getFullYear()} ${appInfo.authorName}, Apache-2.0`);
  await expect(footer.getByRole("link", { name: "Apache-2.0" })).toHaveAttribute("href", "/license.txt");
  await expect(footer.getByRole("link", { name: "kereszteszsolt.hu" })).toHaveAttribute("href", appInfo.authorWebsite);
  const copyright = await footer.locator(".copyright-line").boundingBox();
  const website = await footer.getByRole("link", { name: "kereszteszsolt.hu" }).boundingBox();
  expect(website!.y).toBeGreaterThanOrEqual(copyright!.y + copyright!.height);
  const bounds = await footer.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  expect(await sidebar.locator(".history-content").evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await sidebar.locator(".history-content").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(footer).toBeInViewport();
  await page.screenshot({ path: `test-results/history-${test.info().project.name}.png`, fullPage: true });
  expect(observed.errors).toEqual([]);
  expect(observed.unexpected).toEqual([]);
});

test("320px layout keeps header controls, About and support tooltips inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const observed = await appPage(page);
  await expect(page.getByLabel("Model", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "New chat", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `test-results/header-320-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "About", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("link", { name: "Buy me a Coffee" }).focus();
  const tooltip = dialog.getByRole("tooltip").filter({ hasText: appInfo.authorBuyMeACoffeeUrl });
  await expect(tooltip).toBeVisible();
  const bounds = await tooltip.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  expect(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false);
  await page.screenshot({ path: `test-results/about-320-${test.info().project.name}.png`, fullPage: true });
  await page.keyboard.press("Escape");
  expect(observed.errors).toEqual([]);
  expect(observed.unexpected).toEqual([]);
});

test("model menu supports keyboard selection, cancellation and outside dismissal", async ({ page }) => {
  const observed = await appPage(page);
  const model = page.getByRole("combobox", { name: "Model", exact: true });
  await model.focus();
  await model.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("option", { name: "Fixture model one", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Fixture model two", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(model).toBeFocused();
  await expect(model).toHaveText("Fixture model one");
  await model.press("Enter");
  await expect(page.getByRole("option", { name: "Fixture model one", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Fixture model two", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(model).toHaveText("Fixture model two");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.reload();
  await expect(model).toHaveText("Fixture model two");
  await model.click();
  await page.getByRole("option", { name: "Fixture model one", exact: true }).hover();
  await expect(page.locator("#chat-model")).toHaveText("Fixture model two");
  await page.mouse.click(4, page.viewportSize()!.height - 4);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(model).toHaveText("Fixture model two");
  expect(observed.errors).toEqual([]);
  expect(observed.unexpected).toEqual([]);
});

test("compact model control and its aligned menu contain long names at every header breakpoint", async ({ page }) => {
  const configured = Array.from({ length: 5 }, (_, index) => {
    const id = `provider-${index}/` + "long-reasoning-model-with-extended-context-".repeat(4);
    return { id, label: id };
  });
  const observed = await appPage(page, 0, configured);
  const model = page.getByRole("combobox", { name: "Model", exact: true });
  for (const width of [1280, 820, 768, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(model).toHaveAttribute("title", configured[0].label);
    const trigger = (await model.boundingBox())!;
    expect(trigger.width).toBeLessThanOrEqual(225);
    if (width === 768 || width === 640) expect((await page.locator(".app-header").boundingBox())!.height).toBeLessThan(125);
    await model.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const panel = (await menu.boundingBox())!;
    expect(Math.abs(panel.width - trigger.width)).toBeLessThanOrEqual(1);
    expect(panel.y).toBeGreaterThanOrEqual(trigger.y + trigger.height + 4);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(width);
    await expect(page.getByRole("option")).toHaveCount(5);
    await expect(page.getByRole("option", { name: configured[0].label, exact: true })).toBeFocused();
    await page.getByRole("option", { name: configured[4].label, exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("option", { name: configured[4].label, exact: true })).toBeInViewport();
    expect(await menu.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `test-results/model-menu-${width}-${test.info().project.name}.png`, fullPage: true });
    await page.keyboard.press("Escape");
  }
  expect(observed.errors).toEqual([]);
  expect(observed.unexpected).toEqual([]);
});
