// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mcpReply } from "./fixtures/mcp";
const network = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/server/mcp/network", () => ({ trustedRequest: network.send }));
import { GET, POST } from "@/app/api/integrations/context7/route";
import { context7Integration } from "@/server/mcp/manager";
import { CONTEXT7_ENDPOINT } from "@/server/mcp/config";

function request(body: unknown, origin = "http://localhost:33040") {
  return new Request("http://localhost:3000/api/integrations/context7", { method: "POST",
    headers: { "Content-Type": "application/json", Host: "localhost:33040", Origin: origin }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.stubEnv("MCP_CONTEXT7_URL", CONTEXT7_ENDPOINT); vi.stubEnv("MCP_CONTEXT7_API_KEY", "private-api-canary");
  context7Integration.disable(); network.send.mockReset().mockImplementation(async (_url: URL, init: RequestInit) => mcpReply(init));
});

describe("Context7 route", () => {
  it("GET and disabled updates never contact a server or expose configuration", async () => {
    expect(await GET().json()).toMatchObject({ id: "context7", status: "disabled", enabled: false });
    expect(GET().headers.get("Cache-Control")).toBe("no-store");
    expect((await POST(request({ action: "disable" }))).status).toBe(200);
    expect(network.send).not.toHaveBeenCalled();
    expect(JSON.stringify(await GET().json())).not.toMatch(/private-api-canary|https:|mcp.context7/);
  });
  it("enables only on explicit same-origin action, reuses cached status and clears tools on disable", async () => {
    const enabled = await POST(request({ action: "enable" }));
    expect(enabled.status).toBe(200); expect(await enabled.json()).toMatchObject({ enabled: true, status: "ready" });
    GET(); expect(network.send).toHaveBeenCalledTimes(3);
    const disabled = await POST(request({ action: "disable" }));
    expect(await disabled.json()).toMatchObject({ status: "disabled", enabled: false, tools: [] });
    expect(network.send).toHaveBeenCalledTimes(3);
  });
  it.each([
    {}, { action: "call" }, { action: "enable", url: "http://localhost/private" },
    { action: "enable", apiKey: "browser-key" }, { action: "enable", tools: ["delete-all"] },
  ])("denies malformed commands and browser configuration before any network", async (body) => {
    expect((await POST(request(body))).status).toBe(400); expect(network.send).not.toHaveBeenCalled();
  });
  it.each(["https://evil.invalid", "null", "http://localhost:3000"])("denies foreign/mismatched origin %s", async (origin) => {
    expect((await POST(request({ action: "enable" }, origin))).status).toBe(403);
    expect(network.send).not.toHaveBeenCalled();
  });
  it("rejects oversized/unsupported bodies without discovery", async () => {
    expect((await POST(request({ action: "enable", padding: "x".repeat(300) }))).status).toBe(413);
    expect((await POST(new Request("http://localhost/api/integrations/context7", { method: "POST", body: "{}" }))).status).toBe(415);
    expect(network.send).not.toHaveBeenCalled();
  });
  it("safely denies missing/invalid server configuration", async () => {
    for (const value of ["", "http://127.0.0.1/private-api-canary"]) {
      vi.stubEnv("MCP_CONTEXT7_URL", value);
      const response = await POST(request({ action: "enable" }));
      expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("private-api-canary");
    }
    expect(network.send).not.toHaveBeenCalled();
  });
  it("keeps provider errors private and allows an explicit retry", async () => {
    network.send.mockRejectedValueOnce(new Error("private-api-canary Authorization Bearer secret"));
    const failed = await POST(request({ action: "enable" }));
    expect(failed.status).toBe(503);
    const data = await failed.json(); expect(data).toMatchObject({ status: "unavailable", enabled: false, tools: [] });
    expect(JSON.stringify(data)).not.toMatch(/private-api-canary|Authorization|Bearer/);
    expect((await POST(request({ action: "enable" }))).status).toBe(200);
  });
});
