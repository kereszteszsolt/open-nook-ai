// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { MAX_DIAGRAM_CHARACTERS, MAX_PREVIEW_CHARACTERS } from "./policy";

// Only structural closers are guessed for display; callers retain the original source.
export function completeMath(source: string): string {
  if (source.length > 2000) return source;
  const closers: string[] = [];
  const environments = /^(?:cases|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|smallmatrix|aligned|gathered|array)$/;
  for (const [token, command, environment] of source.matchAll(/\\\\|\\(begin|end)\{([A-Za-z*]+)\}|\\(?:left|right)\b|\\[{}]|[{}]/g)) {
    if (command === "begin") {
      if (!environments.test(environment)) return source;
      closers.push(`\\end{${environment}}`);
    } else if (command === "end") {
      if (closers.pop() !== `\\end{${environment}}`) return source;
    } else if (token === "{" || token === "\\left") closers.push(token === "{" ? "}" : "\\right.");
    else if (token === "}" || token === "\\right") {
      if (closers.pop() !== (token === "}" ? "}" : "\\right.")) return source;
    }
    if (closers.length > 16) return source;
  }
  const completed = source + closers.reverse().join("");
  return completed.length <= 2000 ? completed : source;
}

export function completeJson(source: string): string {
  if (source.length > MAX_PREVIEW_CHARACTERS) return source;
  const closers: string[] = [];
  let quoted = false, escaped = false;
  for (const char of source) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{" || char === "[") closers.push(char === "{" ? "}" : "]");
    else if (char === "}" || char === "]") { if (closers.pop() !== char) return source; }
    if (closers.length > 16) return source;
  }
  if (escaped) return source;
  const completed = source + (quoted ? '"' : "") + closers.reverse().join("");
  return completed.length <= MAX_PREVIEW_CHARACTERS ? completed : source;
}

export function mermaidCandidates(source: string): string[] {
  if (source.length > MAX_DIAGRAM_CHARACTERS) return [];
  // A partial last statement may not parse yet; retain already complete statements.
  const lines = source.trimEnd().split("\n");
  return Array.from({ length: Math.min(4, lines.length - 1) }, (_, i) => lines.slice(0, lines.length - i).join("\n"));
}
