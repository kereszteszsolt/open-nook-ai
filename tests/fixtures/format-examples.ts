// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

export const mermaidExamples = [
  "flowchart LR\n  A[Question] --> B[Answer]",
  "sequenceDiagram\n  User->>App: Question\n  App-->>User: Answer",
  "classDiagram\n  Chat : +String title",
  "stateDiagram-v2\n  [*] --> Ready\n  Ready --> [*]",
  "erDiagram\n  CHAT ||--o{ MESSAGE : contains",
  'pie\n  title Example\n  "A" : 60\n  "B" : 40',
];
