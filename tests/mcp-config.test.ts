// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { CONTEXT7_ENDPOINT, readMCPConfiguration } from "@/server/mcp/config";
import { isPublicAddress } from "@/server/mcp/network";

describe("Context7 configuration", () => {
  it("starts unconfigured, even if only a key was supplied", () => {
    expect(readMCPConfiguration({})).toBeNull();
    expect(readMCPConfiguration({ MCP_CONTEXT7_API_KEY: "private-key" })).toBeNull();
  });
  it("allows only the fixed endpoint and a narrower read-only subset", () => {
    expect(readMCPConfiguration({ MCP_CONTEXT7_URL: CONTEXT7_ENDPOINT })).toEqual({
      endpoint: CONTEXT7_ENDPOINT, apiKey: "", allowedTools: ["resolve-library-id", "query-docs"],
    });
    expect(readMCPConfiguration({ MCP_CONTEXT7_URL: CONTEXT7_ENDPOINT, MCP_CONTEXT7_API_KEY: " private-key ",
      MCP_CONTEXT7_ALLOWED_TOOLS: "query-docs,query-docs" })?.allowedTools).toEqual(["query-docs"]);
  });
  it.each([
    "http://mcp.context7.com/mcp", "https://mcp.context7.com/mcp/", "https://mcp.context7.com:444/mcp",
    "https://mcp.context7.com/mcp?redirect=1", "https://mcp.context7.com/mcp#fragment",
    "https://user:password@mcp.context7.com/mcp", "https://mcp.context7.com.evil.invalid/mcp",
    "http://localhost/mcp", "https://127.0.0.1/mcp", "https://[::1]/mcp", "https://169.254.169.254/mcp",
  ])("denies unapproved destinations: %s", (endpoint) => {
    expect(() => readMCPConfiguration({ MCP_CONTEXT7_URL: endpoint })).toThrow("MCP configuration is invalid");
  });
  it.each([
    { MCP_CONTEXT7_API_KEY: "secret\nInjected: header" }, { MCP_CONTEXT7_API_KEY: "x".repeat(1025) },
    { MCP_CONTEXT7_ALLOWED_TOOLS: "query-docs,delete-all" }, { MCP_CONTEXT7_ALLOWED_TOOLS: "" },
  ])("rejects malformed keys and broader tool policies", (setting) => {
    expect(() => readMCPConfiguration({ MCP_CONTEXT7_URL: CONTEXT7_ENDPOINT, ...setting })).toThrow("MCP configuration is invalid");
  });
});

describe("socket address policy", () => {
  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111", "2001:4860:4860::8888"])("accepts public address %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
  it.each(["0.0.0.0", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255",
    "192.0.0.1", "192.0.2.1", "192.168.0.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255",
    "::", "::1", "::ffff:127.0.0.1", "::ffff:8.8.8.8", "fe80::1", "fc00::1", "ff02::1", "2001:db8::1", "2002:7f00::1", "3fff::1", "not-an-ip"])("denies special/non-public address %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });
});
