// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import katex from "katex";
import { FORMATTING_PROMPT } from "@/server/ai/prompt";
import { parseChart, validateMermaid } from "@/components/rendering/policy";

it("provides math and graphic examples accepted by the actual renderer policies", () => {
  const blocks = [...FORMATTING_PROMPT.matchAll(/```(mermaid|vega-lite)\n([\s\S]*?)\n```/g)];
  expect(blocks).toHaveLength(3);
  for (const [, language, source] of blocks) {
    if (language === "mermaid") expect(validateMermaid(source).source).toBe(source);
    else expect(parseChart(source).data.values).toHaveLength(2);
  }
  const formula = /\$\$\n([\s\S]*?)\n\$\$/.exec(FORMATTING_PROMPT)![1];
  expect(katex.renderToString(formula, { displayMode: true, trust: false, strict: "error", throwOnError: true })).toContain("katex");
});
