// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Children, Component, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock } from "./code-block";
import { MathText } from "./math";
import { remarkLatexMath } from "./remark-latex-math";
import { MAX_PREVIEW_CHARACTERS, safeLink } from "./policy";

class RenderBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function RichText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  let graphics = 0;
  const raw = <pre className="plain-text">{text.slice(0, MAX_PREVIEW_CHARACTERS)}</pre>;
  if (text.length > MAX_PREVIEW_CHARACTERS) return <><p className="render-note">Preview limited to 32,000 characters. Copy the message for its full text.</p>{raw}</>;
  return <RenderBoundary key={streaming ? "streaming" : text} fallback={raw}>
    <div className="rich-text"><ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkLatexMath]}
      skipHtml
      urlTransform={(url) => safeLink(url) ?? ""}
      components={{
        a: ({ href, children }) => href && safeLink(href)
          ? <a href={safeLink(href)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a> : <span>{children}</span>,
        img: ({ alt }) => <span className="render-note">[Image omitted{alt ? `: ${alt}` : ""}]</span>,
        table: ({ children }) => <div className="table-scroll"><table>{children}</table></div>,
        code: ({ children, className }) => /\bmath-(?:inline|display)\b/.test(className ?? "") && !streaming
          ? <MathText text={String(children)} display={className?.includes("math-display")} /> : <code>{children}</code>,
        pre: ({ children }) => {
          const child = Children.toArray(children)[0];
          if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) return <pre>{children}</pre>;
          const language = /language-([\w-]+)/.exec(child.props.className ?? "")?.[1]?.toLowerCase() ?? "";
          const source = String(child.props.children ?? "").replace(/\n$/, "");
          if (language === "mermaid" || language === "vega-lite") graphics++;
          return <CodeBlock text={source} language={language} streaming={streaming} allowGraphic={graphics <= 4} />;
        },
      }}
    >{text}</ReactMarkdown></div>
  </RenderBoundary>;
}
