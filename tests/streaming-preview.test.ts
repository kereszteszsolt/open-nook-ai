// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { completeJson, completeMath, mermaidCandidates } from "@/components/rendering/preview";
import { parseChart, assertMermaidSafety } from "@/components/rendering/policy";
import { streamingFixtures } from "./fixtures/streaming";

it("closes only bounded TeX structure and leaves unsupported/mismatched input intact", () => {
  expect(completeMath(String.raw`\frac{1}{2`)).toBe(String.raw`\frac{1}{2}`);
  expect(completeMath(String.raw`\begin{pmatrix}1&2\\3&4`)).toBe(String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`);
  for (const text of [String.raw`\begin{document}x`, "x}", "{".repeat(17), "x".repeat(2001)]) expect(completeMath(text)).toBe(text);
});
it("closes chart containers without inventing data or admitting external resources", () => {
  const text = streamingFixtures.chart.split("\n").slice(1).join("\n");
  expect(parseChart(completeJson(text)).data.values).toEqual([{ category: "A", amount: 3 }]);
  expect(() => parseChart(completeJson('{"mark":"bar","data":{"url":"https://private.invalid"'))).toThrow();
  for (const text of ["{]", "[".repeat(17), '"trailing\\', "x".repeat(32001)]) expect(completeJson(text)).toBe(text);
});
it("bounds Mermaid prefix attempts and checks the entire untrusted stream first", () => {
  const raw = "flowchart LR\nA[Safe]\nB[unfinished";
  expect(mermaidCandidates(raw)).toEqual([raw, "flowchart LR\nA[Safe]"]);
  expect(mermaidCandidates(raw.repeat(1000))).toHaveLength(0);
  expect(() => assertMermaidSafety(raw + '\nclick A "https://private.invalid"')).toThrow();
});
