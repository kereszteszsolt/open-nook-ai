// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import katex from "katex";

export function MathText({ text, display = false }: { text: string; display?: boolean }) {
  if (text.length > 2000) return <code>{text}</code>;
  let html: string | undefined;
  try {
    html = katex.renderToString(text, {
      displayMode: display, trust: false, strict: "error", throwOnError: true,
      maxExpand: 100, maxSize: 10, output: "htmlAndMathml",
    });
  } catch { /* Invalid or untrusted math remains readable as text. */ }
  return html ? <span className={display ? "math-display" : "math-inline"} dangerouslySetInnerHTML={{ __html: html }} />
    : <span className="render-fallback"><span className="sr-only">Math preview unavailable. </span><code>{text}</code></span>;
}
