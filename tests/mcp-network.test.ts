// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import type { RequestOptions } from "node:https";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
import { CONTEXT7_ENDPOINT } from "@/server/mcp/config";
import { trustedLookup, trustedRequest } from "@/server/mcp/network";

beforeEach(() => { mocks.lookup.mockReset(); mocks.request.mockReset(); });

describe("DNS policy at connection time", () => {
  it("pins only public resolved addresses into the actual socket lookup", () => {
    const answers = [{ address: "1.1.1.1", family: 4 }, { address: "2606:4700::1111", family: 6 }];
    mocks.lookup.mockImplementation((_host, _options, callback) => callback(null, answers));
    const callback = vi.fn();
    trustedLookup(new AbortController().signal)("mcp.context7.com", { all: true }, callback);
    expect(callback).toHaveBeenCalledWith(null, answers);
    trustedLookup(new AbortController().signal)("mcp.context7.com", {}, callback);
    expect(callback).toHaveBeenLastCalledWith(null, "1.1.1.1", 4);
  });
  it.each([
    [{ address: "127.0.0.1", family: 4 }], [{ address: "::ffff:127.0.0.1", family: 6 }],
    [{ address: "1.1.1.1", family: 4 }, { address: "10.0.0.1", family: 4 }], [],
  ].map((answers) => [answers]))("rejects private/mixed/empty DNS answers", (answers) => {
    mocks.lookup.mockImplementation((_host, _options, callback) => callback(null, answers));
    const callback = vi.fn(); trustedLookup(new AbortController().signal)("mcp.context7.com", {}, callback);
    expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
  });
  it("denies a changed destination, DNS errors and resolution after abort", () => {
    const callback = vi.fn(); const controller = new AbortController();
    trustedLookup(controller.signal)("private.invalid", {}, callback);
    expect(mocks.lookup).not.toHaveBeenCalled();
    mocks.lookup.mockImplementation((_host, _options, done) => { controller.abort(); done(null, [{ address: "1.1.1.1", family: 4 }]); });
    trustedLookup(controller.signal)("mcp.context7.com", {}, callback);
    expect(callback.mock.calls.every(([error]) => error instanceof Error)).toBe(true);
  });
});

describe("HTTPS boundary", () => {
  function fakeResponse(status = 200) {
    const incoming = Object.assign(Readable.from([Buffer.from('{"safe":true}')]), { statusCode: status, headers: { "content-type": "application/json" } }) as IncomingMessage;
    const connection = Object.assign(new EventEmitter(), { end: vi.fn(() => queueMicrotask(() => callback(incoming))) });
    let callback: (message: IncomingMessage) => void;
    mocks.request.mockImplementation((_url, _options, done) => { callback = done; return connection; });
    return { connection, incoming };
  }
  it("uses TLS, no pooled socket, bounded headers, abort and the pinned lookup", async () => {
    fakeResponse(); const signal = new AbortController().signal;
    const response = await trustedRequest(new URL(CONTEXT7_ENDPOINT), { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, signal);
    expect(await response.json()).toEqual({ safe: true });
    const options = mocks.request.mock.calls[0][1] as RequestOptions;
    expect(options).toMatchObject({ agent: false, signal, maxHeaderSize: 8192, method: "POST" });
    expect(options.lookup).toBeTypeOf("function");
    expect(options.rejectUnauthorized).toBe(true);
  });
  it.each([301, 304, 307, 401, 500])("rejects non-success %s without following redirects or parsing headers", async (status) => {
    const { incoming } = fakeResponse(status);
    await expect(trustedRequest(new URL(CONTEXT7_ENDPOINT), { method: "POST", body: "{}" }, new AbortController().signal)).rejects.toThrow();
    expect(incoming.destroyed).toBe(true); expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("rejects arbitrary URLs before DNS or a socket is opened", async () => {
    await expect(trustedRequest(new URL("https://127.0.0.1/private"), {}, new AbortController().signal)).rejects.toThrow();
    expect(mocks.request).not.toHaveBeenCalled(); expect(mocks.lookup).not.toHaveBeenCalled();
  });
});
