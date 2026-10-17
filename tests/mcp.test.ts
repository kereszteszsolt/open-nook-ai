// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeTools, mcpReply } from "./fixtures/mcp";

const network = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/server/mcp/network", () => ({ trustedRequest: network.send }));
import { CONTEXT7_ENDPOINT, DISCOVERY_TIMEOUT_MS, MAX_MCP_RESPONSE_BYTES, MCPDiscoveryError } from "@/server/mcp/config";
import { createDiscoveryFetch, discoverContext7 } from "@/server/mcp/client";
import { createIntegrationManager } from "@/server/mcp/manager";

const config = { endpoint: CONTEXT7_ENDPOINT, apiKey: "private-fixture-canary", allowedTools: ["resolve-library-id", "query-docs"] as const };
const configure = () => ({ ...config, allowedTools: [...config.allowedTools] });
const signal = () => new AbortController().signal;
beforeEach(() => { network.send.mockReset().mockImplementation(async (_url: URL, init: RequestInit) => mcpReply(init)); });

describe("real MCP SDK discovery with fake HTTP", () => {
  it("makes no network call for status, returns safe allowlisted metadata, and does not execute tools", async () => {
    const manager = createIntegrationManager(discoverContext7, configure);
    expect(manager.status()).toMatchObject({ status: "disabled", enabled: false });
    expect(network.send).not.toHaveBeenCalled();
    const result = await manager.enable(signal());
    expect(result).toMatchObject({ status: "ready", enabled: true });
    expect(result.tools.map((tool) => tool.name)).toEqual(config.allowedTools);
    expect(JSON.stringify(result)).not.toMatch(/private-fixture|instructions|<script|delete-all|inputSchema|https:/);
    expect(network.send.mock.calls.map(([, init]) => JSON.parse(init.body).method)).toEqual(["initialize", "notifications/initialized", "tools/list"]);
    for (const [url, init] of network.send.mock.calls) {
      expect(String(url)).toBe(CONTEXT7_ENDPOINT);
      expect(init.redirect).toBe("error");
      expect(new Headers(init.headers).get("authorization")).toBe("Bearer private-fixture-canary");
    }
    await manager.enable(signal()); manager.status(); manager.disable();
    expect(network.send).toHaveBeenCalledTimes(3);
    expect(manager.status()).toMatchObject({ enabled: false, status: "disabled", tools: [] });
  });
  it("filters unexpected tools and respects a narrower configured subset", async () => {
    network.send.mockImplementation(async (_url: URL, init: RequestInit) => mcpReply(init, [...fakeTools, { ...fakeTools[0], name: "delete-all" }]));
    const result = await discoverContext7({ ...configure(), allowedTools: ["query-docs"] }, signal());
    expect(result.map((tool) => tool.name)).toEqual(["query-docs"]);
  });
  it("walks valid pages explicitly and releases a server session after success", async () => {
    network.send.mockImplementation(async (_url: URL, init: RequestInit) => {
      if (init.method === "DELETE") return new Response(null, { status: 204 });
      const message = JSON.parse(String(init.body));
      const response = mcpReply(init);
      if (message.method === "initialize") { response.headers.set("mcp-session-id", "fixture-session"); return response; }
      if (message.method !== "tools/list") return response;
      return Response.json({ jsonrpc: "2.0", id: message.id, result: message.params?.cursor
        ? { tools: [fakeTools[1]] } : { tools: [fakeTools[0]], nextCursor: "second-page" } });
    });
    expect((await createIntegrationManager(discoverContext7, configure).enable(signal())).tools).toHaveLength(2);
    expect(network.send).toHaveBeenCalledTimes(5);
    expect(network.send.mock.calls.at(-1)?.[1].method).toBe("DELETE");
  });
  it.each([
    [], [{ ...fakeTools[0], name: "delete-all" }], [fakeTools[0], fakeTools[0]],
    [{ ...fakeTools[0], annotations: { readOnlyHint: false } }],
    [{ ...fakeTools[0], annotations: { destructiveHint: true } }],
    [{ ...fakeTools[0], inputSchema: { type: "string" } }],
    [{ ...fakeTools[0], description: "x".repeat(8001) }],
    Array.from({ length: 33 }, (_, i) => ({ ...fakeTools[0], name: `unknown-${i}` })),
  ].map((tools) => [tools]))("rejects malformed, contradictory or unusable metadata without later calls", async (tools) => {
    network.send.mockImplementation(async (_url: URL, init: RequestInit) => mcpReply(init, tools));
    const manager = createIntegrationManager(discoverContext7, configure);
    expect(await manager.enable(signal())).toMatchObject({ enabled: false, status: "unavailable", tools: [] });
    expect(network.send).toHaveBeenCalledTimes(3);
  });
  it.each([301, 302, 307, 308, 401, 403, 500])("never follows/retries failed HTTP %s", async (status) => {
    network.send.mockResolvedValue(new Response("private-fixture-canary", { status, headers: { Location: "http://127.0.0.1/private" } }));
    const result = await createIntegrationManager(discoverContext7, configure).enable(signal());
    expect(result).toMatchObject({ status: "unavailable", enabled: false, tools: [] });
    expect(JSON.stringify(result)).not.toContain("private-fixture-canary");
    expect(network.send).toHaveBeenCalledTimes(1);
  });
  it("bounds pagination even when the server never ends it", async () => {
    network.send.mockImplementation(async (_url: URL, init: RequestInit) => {
      const response = mcpReply(init);
      if (JSON.parse(String(init.body)).method !== "tools/list") return response;
      const body = await response.json(); body.result.nextCursor = "again";
      return Response.json(body);
    });
    expect(await createIntegrationManager(discoverContext7, configure).enable(signal())).toMatchObject({ status: "unavailable", enabled: false });
    expect(network.send.mock.calls.filter(([, init]) => JSON.parse(init.body).method === "tools/list").length).toBeLessThanOrEqual(3);
  });
  it("does not follow a cursor after invalid metadata on the current page", async () => {
    network.send.mockImplementation(async (_url: URL, init: RequestInit) => {
      const response = mcpReply(init, [{ ...fakeTools[0], annotations: { readOnlyHint: false } }]);
      if (JSON.parse(String(init.body)).method !== "tools/list") return response;
      const body = await response.json(); body.result.nextCursor = "never-follow-this";
      return Response.json(body);
    });
    expect(await createIntegrationManager(discoverContext7, configure).enable(signal())).toMatchObject({ status: "unavailable" });
    expect(network.send).toHaveBeenCalledTimes(3);
  });
  it.each(["declared", "streamed"])("rejects %s oversize responses before opening further connections", async (mode) => {
    const cancel = vi.fn();
    network.send.mockResolvedValue(new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_MCP_RESPONSE_BYTES + 1)); }, cancel }),
      { headers: { "content-type": "application/json", ...(mode === "declared" ? { "content-length": String(MAX_MCP_RESPONSE_BYTES + 1) } : {}) } }));
    expect(await createIntegrationManager(discoverContext7, configure).enable(signal())).toMatchObject({ status: "unavailable", tools: [] });
    expect(network.send).toHaveBeenCalledTimes(1); expect(cancel).toHaveBeenCalled();
  });
  it.each(["invalid JSON", "invalid UTF-8", "wrong media type"])("handles %s without fallback requests", async (mode) => {
    vi.useFakeTimers();
    network.send.mockResolvedValue(new Response(mode === "invalid UTF-8" ? new Uint8Array([0xff]) : "not a protocol reply",
      { headers: { "content-type": mode === "wrong media type" ? "text/html" : "application/json" } }));
    const pending = createIntegrationManager(discoverContext7, configure).enable(signal());
    await vi.advanceTimersByTimeAsync(DISCOVERY_TIMEOUT_MS);
    expect(await pending).toMatchObject({ enabled: false, status: "unavailable", tools: [] });
    expect(network.send).toHaveBeenCalledTimes(1);
  });
  it("cancels a hanging response body on the total deadline", async () => {
    vi.useFakeTimers(); const cancel = vi.fn();
    network.send.mockResolvedValue(new Response(new ReadableStream({ cancel }), { headers: { "content-type": "application/json" } }));
    const pending = createIntegrationManager(discoverContext7, configure).enable(signal());
    await vi.advanceTimersByTimeAsync(DISCOVERY_TIMEOUT_MS);
    expect(await pending).toMatchObject({ status: "unavailable", error: "timed_out" });
    expect(cancel).toHaveBeenCalled(); expect(network.send).toHaveBeenCalledTimes(1);
  });
  it("supports bounded POST SSE replies without opening a GET event stream", async () => {
    network.send.mockImplementation(async (_url: URL, init: RequestInit) => {
      const response = mcpReply(init);
      if (response.status === 202) return response;
      return new Response(`event: message\ndata: ${JSON.stringify(await response.json())}\n\n`, { headers: { "content-type": "text/event-stream" } });
    });
    expect(await createIntegrationManager(discoverContext7, configure).enable(signal())).toMatchObject({ status: "ready" });
    expect(network.send).toHaveBeenCalledTimes(3);
  });
  it("never forwards a tools/call request, unexpected method or URL", async () => {
    for (const [url, method] of [[CONTEXT7_ENDPOINT, "tools/call"], ["http://127.0.0.1/private", "initialize"]]) {
      const fetcher = createDiscoveryFetch(configure(), signal(), new AbortController(), network.send);
      await expect(fetcher(new URL(url), { method: "POST", body: JSON.stringify({ method }) })).rejects.toBeInstanceOf(MCPDiscoveryError);
    }
    expect(network.send).not.toHaveBeenCalled();
  });
});

describe("enable/disable lifecycle", () => {
  it("has a total deadline even if the dependency ignores cancellation", async () => {
    vi.useFakeTimers();
    const discover = vi.fn(() => new Promise<never>(() => {}));
    const manager = createIntegrationManager(discover, configure);
    const pending = manager.enable(signal());
    await vi.advanceTimersByTimeAsync(DISCOVERY_TIMEOUT_MS);
    expect(await pending).toMatchObject({ status: "unavailable", enabled: false, error: "timed_out" });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("single-flights discovery, revokes it immediately and ignores late success", async () => {
    let resolve!: (tools: []) => void;
    const discover = vi.fn((configuration, discoverySignal: AbortSignal) => {
      expect(configuration.endpoint).toBe(CONTEXT7_ENDPOINT); expect(discoverySignal.aborted).toBe(false);
      return new Promise<[]>((done) => { resolve = done; });
    });
    const manager = createIntegrationManager(discover, configure);
    const pending = manager.enable(signal());
    expect(await manager.enable(signal())).toMatchObject({ status: "connecting" });
    manager.disable();
    expect(discover.mock.calls[0][1].aborted).toBe(true);
    resolve([]); await pending;
    expect(discover).toHaveBeenCalledTimes(1);
    expect(manager.status()).toMatchObject({ status: "disabled", tools: [] });
  });
  it("cancels disconnected requests and drops snapshots if configuration changes", async () => {
    const controller = new AbortController();
    const manager = createIntegrationManager(() => new Promise<never>(() => {}), configure);
    const pending = manager.enable(controller.signal); controller.abort();
    expect(await pending).toMatchObject({ status: "disabled", error: null });
    let configured = true;
    const other = createIntegrationManager(async () => [{ name: "query-docs", description: "Documentation" }], () => configured ? configure() : null);
    await other.enable(signal()); configured = false;
    expect(other.status()).toMatchObject({ status: "not_configured", enabled: false, tools: [] });
  });
});
