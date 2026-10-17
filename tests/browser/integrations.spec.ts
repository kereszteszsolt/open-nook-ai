// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { test, expect, type Page } from "@playwright/test";
import { context7Tools, type IntegrationSnapshot } from "../../src/shared/integrations";

const disabled: IntegrationSnapshot = { id: "context7", configured: true, enabled: false, status: "disabled", tools: [], checkedAt: null, error: null };
const ready: IntegrationSnapshot = { ...disabled, enabled: true, status: "ready", checkedAt: "2026-10-17T00:00:00.000Z",
  tools: Object.entries(context7Tools).map(([name, description]) => ({ name: name as "query-docs" | "resolve-library-id", description })) };
async function pageSetup(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    if (!["127.0.0.1", "web"].includes(new URL(route.request().url()).hostname)) { external.push(route.request().url()); return route.abort(); }
    return route.fallback();
  });
  await page.route("**/api/models", route => route.fulfill({ json: { enabled: false, status: "missing_api_key", models: [] } }));
  await page.route("**/api/conversations**", route => route.fulfill({ json: { conversations: [], nextCursor: null } }));
  return { errors, external };
}
async function open(page: Page) {
  await page.locator(".integration-control summary").click();
  return page.getByRole("region", { name: "Context7 integration" });
}

test("unconfigured integration is visible and inert on page load", async ({ page }) => {
  const observed = await pageSetup(page); let posts = 0;
  await page.route("**/api/integrations/context7", route => {
    if (route.request().method() !== "GET") posts++;
    return route.fulfill({ json: { ...disabled, configured: false, status: "not_configured" } });
  });
  await page.goto("/"); const panel = await open(page);
  await expect(panel.getByRole("status")).toHaveText("Not configured");
  await expect(panel.getByRole("button", { name: "Enable Context7" })).toBeDisabled();
  expect(posts).toBe(0); expect(observed.errors).toEqual([]); expect(observed.external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("discovery errors are recoverable and only explicit controls enable or disable", async ({ page }) => {
  const observed = await pageSetup(page); const actions: string[] = []; let snapshot = disabled;
  await page.route("**/api/integrations/context7", route => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON(); expect(Object.keys(body)).toEqual(["action"]); actions.push(body.action);
      snapshot = body.action === "disable" ? disabled : actions.length === 1 ? { ...disabled, status: "unavailable", error: "timed_out" } : ready;
    }
    return route.fulfill({ status: snapshot.status === "unavailable" ? 503 : 200, json: snapshot });
  });
  await page.goto("/"); const panel = await open(page);
  await expect(panel.getByRole("status")).toHaveText("Disabled"); expect(actions).toEqual([]);
  await panel.getByRole("button", { name: "Enable Context7" }).click();
  await expect(panel.getByRole("alert")).toContainText("timed out");
  await panel.getByRole("button", { name: "Enable Context7" }).click();
  await expect(panel.getByRole("status")).toHaveText("Tools discovered");
  await expect(panel.locator("li")).toHaveCount(2);
  await panel.getByRole("button", { name: "Refresh status" }).click();
  expect(actions).toEqual(["enable", "enable"]);
  await panel.getByRole("button", { name: "Disable Context7" }).click();
  await expect(panel.getByRole("status")).toHaveText("Disabled"); await expect(panel.locator("li")).toHaveCount(0);
  expect(actions).toEqual(["enable", "enable", "disable"]);
  expect(observed.errors).toEqual([]); expect(observed.external).toEqual([]);
});

test("a pending discovery can be disabled without late results replacing disabled state", async ({ page }) => {
  const observed = await pageSetup(page); const actions: string[] = [];
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/integrations/context7", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: disabled });
    const { action } = route.request().postDataJSON(); actions.push(action);
    if (action === "enable") { await hold; await route.fulfill({ json: ready }).catch(() => {}); }
    else await route.fulfill({ json: disabled });
  });
  await page.goto("/"); const panel = await open(page);
  await panel.getByRole("button", { name: "Enable Context7" }).click();
  await expect(panel.getByRole("status")).toHaveText("Discovering tools…");
  await expect.poll(() => actions).toEqual(["enable"]);
  await panel.getByRole("button", { name: "Disable Context7" }).click();
  await expect(panel.getByRole("status")).toHaveText("Disabled"); release();
  await expect(panel.locator("li")).toHaveCount(0); expect(actions).toEqual(["enable", "disable"]);
  expect(observed.errors).toEqual([]); expect(observed.external).toEqual([]);
});

test("guarded fake MCP discovery uses real routes and SDK, and refresh/reload never reconnect", async ({ page }) => {
  test.skip(process.env.E2E_MCP !== "1", "Requires the guarded fake MCP preload and isolated database.");
  const observed = await pageSetup(page);
  const change = (action: string) => page.request.post("/api/integrations/context7", { data: { action } });
  await change("disable");
  const stats = async () => (await (await page.request.get("http://127.0.0.1:3001/stats")).json()).methods as string[];
  const before = (await stats()).length;
  await page.goto("/"); let panel = await open(page);
  await expect(panel.getByRole("status")).toHaveText("Disabled"); expect((await stats()).length).toBe(before);
  await panel.getByRole("button", { name: "Enable Context7" }).click();
  await expect(panel.getByRole("status")).toHaveText("Tools discovered");
  await expect(panel.locator("li code")).toHaveText(["resolve-library-id", "query-docs"]);
  await expect(panel).not.toContainText("private-mcp-fixture"); await expect(panel).not.toContainText("delete-all");
  expect((await stats()).slice(before)).toEqual(["initialize", "notifications/initialized", "tools/list"]);
  await page.reload(); panel = await open(page);
  await expect(panel.getByRole("status")).toHaveText("Tools discovered");
  await panel.getByRole("button", { name: "Refresh status" }).click();
  expect((await stats()).length).toBe(before + 3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `test-results/context7-${test.info().project.name}.png`, fullPage: true });
  await panel.getByRole("button", { name: "Disable Context7" }).click();
  await expect(panel.getByRole("status")).toHaveText("Disabled"); expect((await stats()).length).toBe(before + 3);
  expect(observed.errors).toEqual([]); expect(observed.external).toEqual([]);
});
