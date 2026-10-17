// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

export const streamingFixtures = {
  math: String.raw`Partial formula: \[\begin{pmatrix}1&2\\3&4`,
  code: "```javascript\nconst answer = { value: 42",
  mermaid: "```mermaid\nflowchart LR\nA[Question] --> B[Answer]\nB --> C[Unfinished",
  chart: '```vega-lite\n{"mark":"bar","data":{"values":[{"category":"A","amount":3}]},"encoding":{"x":{"field":"category","type":"nominal"},"y":{"field":"amount","type":"quantitative"',
} as const;
