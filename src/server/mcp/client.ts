// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import { Client, StreamableHTTPClientTransport, type FetchLike } from "@modelcontextprotocol/client";
import { context7Tools, type Context7ToolName, type IntegrationSnapshot } from "@/shared/integrations";
import { CONTEXT7_ENDPOINT, DISCOVERY_TIMEOUT_MS, MAX_MCP_RESPONSE_BYTES, MCPDiscoveryError, type MCPConfiguration } from "./config";
import { trustedRequest, type MCPRequest } from "./network";

export function createDiscoveryFetch(config: MCPConfiguration, parent: AbortSignal, stop: AbortController, send: MCPRequest = trustedRequest): FetchLike {
  let requests = 0;
  let totalBytes = 0;
  const signal = AbortSignal.any([parent, stop.signal]);
  const fail = () => { const error = new MCPDiscoveryError("invalid_metadata"); stop.abort(error); return error; };
  return async (input, init = {}) => {
    signal.throwIfAborted();
    if (String(input) !== CONTEXT7_ENDPOINT || config.endpoint !== CONTEXT7_ENDPOINT) throw fail();
    // Discovery needs no unsolicited event channel, subscriptions, OAuth or transport fallback.
    if (init.method === "GET") return new Response(null, { status: 405 });
    if (!["POST", "DELETE"].includes(init.method ?? "") || ++requests > 6) throw fail();
    if (init.method === "POST") {
      if (typeof init.body !== "string" || new TextEncoder().encode(init.body).length > 8192) throw fail();
      let message;
      try { message = JSON.parse(init.body); } catch { throw fail(); }
      if (!message || !["initialize", "notifications/initialized", "tools/list"].includes(message.method)) throw fail();
    }
    const headers = new Headers();
    const original = new Headers(init.headers);
    for (const name of ["accept", "content-type", "mcp-session-id", "mcp-protocol-version"]) {
      const value = original.get(name);
      if (value) headers.set(name, value);
    }
    if (config.apiKey) headers.set("authorization", `Bearer ${config.apiKey}`);
    let response: Response;
    try { response = await send(new URL(CONTEXT7_ENDPOINT), { ...init, headers, redirect: "error" }, AbortSignal.any([signal, ...(init.signal ? [init.signal] : [])])); }
    catch { const error = new MCPDiscoveryError(); stop.abort(error); throw error; }
    if (!response.ok || response.redirected) { void response.body?.cancel().catch(() => {}); throw fail(); }
    const session = response.headers.get("mcp-session-id");
    const length = response.headers.get("content-length");
    if ((session !== null && !/^[\x21-\x7e]{1,128}$/.test(session))
      || (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_MCP_RESPONSE_BYTES))) {
      void response.body?.cancel().catch(() => {}); throw fail();
    }
    if (!response.body) return response;
    const reader = response.body.getReader();
    let bytes = 0;
    const cancel = () => { void reader.cancel().catch(() => {}); };
    signal.addEventListener("abort", cancel, { once: true });
    const cleanup = () => { signal.removeEventListener("abort", cancel); reader.releaseLock(); };
    const body = new ReadableStream<Uint8Array>({
      async pull(target) {
        try {
          const part = await reader.read(); signal.throwIfAborted();
          if (part.done) { target.close(); cleanup(); return; }
          bytes += part.value.byteLength; totalBytes += part.value.byteLength;
          if (bytes > MAX_MCP_RESPONSE_BYTES || totalBytes > 2 * MAX_MCP_RESPONSE_BYTES) throw fail();
          target.enqueue(part.value);
        } catch { target.error(fail()); cancel(); cleanup(); }
      },
      async cancel() { await reader.cancel().catch(() => {}); cleanup(); },
    });
    return new Response(body, { status: response.status, headers: response.headers });
  };
}

export async function discoverContext7(config: MCPConfiguration, parent: AbortSignal): Promise<IntegrationSnapshot["tools"]> {
  const stop = new AbortController();
  const signal = AbortSignal.any([parent, stop.signal]);
  const client = new Client({ name: "open-nook-ai", version: "0.1.0" }, {
    capabilities: {}, versionNegotiation: { mode: "legacy" }, listMaxPages: 3,
    inputRequired: { autoFulfill: false }, enforceStrictCapabilities: true,
  });
  const transport = new StreamableHTTPClientTransport(new URL(config.endpoint), {
    fetch: createDiscoveryFetch(config, signal, stop), requestInit: { redirect: "error" },
    reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 0, maxReconnectionDelay: 0, reconnectionDelayGrowFactor: 1 },
    onInsufficientScope: "throw", maxStepUpRetries: 0,
  });
  client.onerror = () => {};
  let completed = false;
  try {
    await client.connect(transport, { signal, timeout: DISCOVERY_TIMEOUT_MS });
    const names = new Set<string>();
    const available = new Set<Context7ToolName>();
    const cursors = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < 3; page++) {
      // Walk explicitly: the SDK's convenience aggregator treats a repeated page as a successful end.
      const result = await client.request({ method: "tools/list", params: cursor ? { cursor } : {} }, { signal, timeout: DISCOVERY_TIMEOUT_MS });
      for (const tool of result.tools) {
        if (names.has(tool.name) || names.size >= 32 || tool.name.length > 100 || (tool.description?.length ?? 0) > 8000
          || tool.inputSchema.type !== "object") throw new MCPDiscoveryError("invalid_metadata");
        names.add(tool.name);
        if (config.allowedTools.includes(tool.name as Context7ToolName)) {
          if (tool.annotations?.readOnlyHint === false || tool.annotations?.destructiveHint === true) throw new MCPDiscoveryError("invalid_metadata");
          available.add(tool.name as Context7ToolName);
        }
      }
      if (result.nextCursor === undefined) break;
      if (page === 2 || !/^[\x21-\x7e]{1,256}$/.test(result.nextCursor) || cursors.has(result.nextCursor)) throw new MCPDiscoveryError("invalid_metadata");
      cursor = result.nextCursor; cursors.add(cursor);
    }
    if (!available.size) throw new MCPDiscoveryError("invalid_metadata");
    completed = true;
    // Remote descriptions, instructions, schemas, icons and server identity never enter the browser or model context.
    return config.allowedTools.filter((name) => available.has(name)).map((name) => ({ name, description: context7Tools[name] }));
  } catch (error) { throw error instanceof MCPDiscoveryError ? error : new MCPDiscoveryError(signal.reason instanceof MCPDiscoveryError ? signal.reason.code : "connection_failed"); }
  finally {
    try { if (completed && !signal.aborted) await transport.terminateSession(); }
    finally { stop.abort(); await client.close().catch(() => {}); }
  }
}
