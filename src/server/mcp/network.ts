// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import { lookup } from "node:dns";
import { request } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { Readable } from "node:stream";
import { CONTEXT7_ENDPOINT, MCPDiscoveryError } from "./config";

const privateAddresses = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) privateAddresses.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) {
  privateAddresses.addSubnet(address, prefix, "ipv6");
}
const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? !privateAddresses.check(address, "ipv4")
    : family === 6 && globalIPv6.check(address, "ipv6") && !privateAddresses.check(address, "ipv6");
}

export function trustedLookup(signal: AbortSignal): LookupFunction {
  return (hostname, options, callback) => {
    if (hostname !== "mcp.context7.com" || signal.aborted) { callback(new MCPDiscoveryError(), "", 4); return; }
    lookup(hostname, { all: true }, (error, addresses) => {
      if (error || signal.aborted || !addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
        callback(new MCPDiscoveryError(), "", 4); return;
      }
      // Resolve at the actual socket boundary; a separate preflight lookup would permit DNS rebinding.
      if (options.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

export type MCPRequest = (url: URL, init: RequestInit, signal: AbortSignal) => Promise<Response>;
export const trustedRequest: MCPRequest = (url, init, signal) => {
  if (url.href !== CONTEXT7_ENDPOINT) return Promise.reject(new MCPDiscoveryError());
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const connection = request(url, {
      method: init.method, headers: Object.fromEntries(new Headers(init.headers)),
      agent: false, lookup: trustedLookup(signal), signal, maxHeaderSize: 8192, rejectUnauthorized: true,
    }, (incoming) => {
      try {
        if (!incoming.statusCode || incoming.statusCode < 200 || incoming.statusCode >= 300) throw new MCPDiscoveryError();
        const headers = new Headers();
        for (const name of ["content-type", "content-length", "mcp-session-id"]) {
          const value = incoming.headers[name];
          if (typeof value === "string") headers.set(name, value);
        }
        const empty = incoming.statusCode === 204 || incoming.statusCode === 205;
        resolve(new Response(empty ? null : Readable.toWeb(incoming) as ReadableStream<Uint8Array>, { status: incoming.statusCode, headers }));
        if (empty) incoming.resume();
      } catch { incoming.destroy(); reject(new MCPDiscoveryError()); }
    });
    connection.on("error", () => reject(new MCPDiscoveryError()));
    connection.end(typeof init.body === "string" ? init.body : undefined);
  });
};
