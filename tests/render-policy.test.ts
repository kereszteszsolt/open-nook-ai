// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { parseChart, safeLink, validateMermaid } from "@/components/rendering/policy";

import { percentagePie } from "./fixtures/pie";

const chart = { mark: "bar", data: { values: [{ category: "A", amount: 3 }] }, encoding: { x: { field: "category", type: "nominal" }, y: { field: "amount", type: "quantitative" } } };

describe("rich content boundaries", () => {
  it.each(["javascript:alert(1)", "data:text/html,hello", "//host.invalid/x", "/local", "file:///etc/passwd", "https://ok.invalid/\nattack", "https:\\host.invalid"])("denies unsafe link %s", (value) => {
    expect(safeLink(value)).toBeUndefined();
  });
  it("allows explicit web and mail links", () => {
    expect(safeLink("https://example.com/page")).toBe("https://example.com/page");
    expect(safeLink("mailto:hello@example.com")).toBe("mailto:hello@example.com");
  });
  it("accepts a bounded ordinary flowchart", () => expect(validateMermaid("flowchart LR\nA[Idea] --> B[Result]").source).toContain("Idea"));
  it.each([
    "%%{init: {securityLevel: 'loose'}}%%\nflowchart LR\nA-->B", "---\nconfig: {}\n---\nflowchart LR\nA-->B",
    "flowchart LR\nA[<img src=x onerror=alert(1)>]", "flowchart LR\nclick A callback", "flowchart LR\nA[https://private.invalid/data]",
    "flowchart LR\nstyle A fill:url(//private.invalid)", "flowchart LR\nA@{img: data:payload}", "not a diagram",
    "flowchart LR\n" + "A-->B\n".repeat(101), "flowchart LR\n" + "A".repeat(6001),
  ])("rejects unsafe or oversized Mermaid %#", (text) => expect(() => validateMermaid(text)).toThrow());
  it("accepts inline chart data with bounded dimensions", () => {
    expect(parseChart(JSON.stringify(chart))).toMatchObject({ ...chart, width: 480, height: 260 });
  });
  it.each([
    { ...chart, data: { url: "https://private.invalid/data" } }, { ...chart, transform: [{ calculate: "fetch('x')", as: "x" }] },
    { ...chart, params: [{ name: "run", expr: "evil()" }] }, { ...chart, mark: { type: "image", url: "https://x.invalid" } },
    { ...chart, encoding: { ...chart.encoding, href: { field: "category", type: "nominal" } } },
    { ...chart, encoding: { ...chart.encoding, x: { field: "missing", type: "nominal" } } },
    { ...chart, data: { values: [{ category: "A", amount: "3" }] } }, { ...chart, width: 99999 },
    { ...chart, data: { values: Array.from({ length: 501 }, () => chart.data.values[0]) } },
    { ...chart, encoding: { ...chart.encoding, x: { field: "constructor", type: "nominal" } } },
    { ...chart, config: { background: "url(https://bad.invalid)" } },
  ])("rejects remote, executable or unbounded Vega-Lite input %#", (spec) => expect(() => parseChart(JSON.stringify(spec))).toThrow());
  it("rejects malformed or oversized chart JSON", () => {
    expect(() => parseChart("{partial")).toThrow();
    expect(() => parseChart(" ".repeat(32001))).toThrow();
  });
});


it("prepares the reported percentage pie without changing labels or values", () => {
  expect(validateMermaid(percentagePie)).toEqual({
    source: percentagePie.replace(/%/g, ""),
    note: "Values total 122.4%; slices show their share of this total.",
  });
});

it("keeps native pie values, quoted percent labels and showData unchanged", () => {
  const source = 'pie showData title Usage\n"100% local" : 2\n"Other" : 3';
  expect(validateMermaid(source)).toEqual({ source });
  expect(validateMermaid('pie\n"A" : 25%\n"B" : 75%')).toEqual({ source: 'pie\n"A" : 25\n"B" : 75' });
});
it.each([
  'pie\n"A" : 0', 'pie\n"A" : -2', 'pie\n"A" : NaN', 'pie\n"A" : 1e99',
  'pie\n"A" : 1000000000001', 'pie\n"A" : 1.234', 'pie\n"A" : 10%%',
  'pie\n"A" : 10%\n"B" : 90', 'pie\n"A" : 1\n"A" : 2',
  'pie\n"A" : 10 " #FFD700" // Color', 'pie\n" " : 1', 'pie\ntitle Empty',
  'pie\ntitle First\ntitle Second\n"A" : 1',
  'pie\n"A" : 1\nclick A callback', 'pie\n%%{init: {securityLevel: "loose"}}%%\n"A" : 1',
  'pie\n"<img src=x>" : 1', 'pie\n"https://private.invalid" : 1',
])("rejects malformed, ambiguous or unsafe pie input %#", (source) => expect(() => validateMermaid(source)).toThrow());
