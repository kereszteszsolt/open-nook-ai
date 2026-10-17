// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { memo, type ReactNode } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import { CopyButton } from "./copy-button";
import { Graphic } from "./graphics";
import { MathText } from "./math";
import { MAX_CODE_CHARACTERS } from "./policy";

function tokens(parts: (string | Prism.Token)[], depth = 0): ReactNode {
  return parts.map((part, index) => {
    if (typeof part === "string") return part;
    const content = typeof part.content === "string" ? part.content : Array.isArray(part.content) ? part.content : [part.content];
    return <span key={index} className={`token ${part.type}`}>{typeof content === "string" ? content : depth < 24 ? tokens(content, depth + 1) : Prism.Token.stringify(part, "text")}</span>;
  });
}

export const CodeBlock = memo(function CodeBlock({ text, language, streaming, allowGraphic = true }: {
  text: string; language: string; streaming: boolean; allowGraphic?: boolean;
}) {
  const graphic = language === "mermaid" || language === "vega-lite";
  if (language === "math" && !streaming) return <MathText text={text} display />;
  const grammar = Object.hasOwn(Prism.languages, language) ? Prism.languages[language] : undefined;
  const highlighted = !streaming && text.length <= MAX_CODE_CHARACTERS && grammar ? tokens(Prism.tokenize(text, grammar)) : text;
  return <div className="code-block">
    <div className="code-toolbar"><span>{language || "text"}</span><CopyButton text={text} label="Copy code" /></div>
    {graphic && !streaming && allowGraphic && <Graphic source={text} kind={language} />}
    {graphic && streaming && <p className="render-note">Preview appears when the response finishes.</p>}
    {graphic && !allowGraphic && <p className="render-note">Preview limit reached. Source is shown below.</p>}
    <pre><code className={grammar ? `language-${language}` : undefined}>{highlighted}</code></pre>
  </div>;
});
