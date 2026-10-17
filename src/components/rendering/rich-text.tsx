// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { Children, Component, createContext, isValidElement, useContext, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { Code } from "mdast";
import type { Node, Parent } from "unist";
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

const Streaming = createContext(false);

function remarkGraphicBudget() {
  return (tree: Node) => {
    let graphics = 0;
    const visit = (node: Node) => {
      if (node.type === "code") {
        const code = node as Code;
        const language = code.lang?.toLowerCase();
        if (language === "mermaid" || language === "vega-lite") {
          graphics++;
          code.data = { ...code.data, hProperties: { "data-graphic-allowed": graphics <= 4 } };
        }
      }
      if ("children" in node) (node as Parent).children.forEach(visit);
    };
    visit(tree);
  };
}

const InlineCode: NonNullable<Components["code"]> = function InlineCode({ children, className }) {
  const streaming = useContext(Streaming);
  return /\bmath-(?:inline|display)\b/.test(className ?? "")
    ? <MathText streaming={streaming} text={String(children)} display={className?.includes("math-display")} /> : <code>{children}</code>;
};
const FencedCode: NonNullable<Components["pre"]> = function FencedCode({ children }) {
  const streaming = useContext(Streaming);
  const child = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode; "data-graphic-allowed"?: boolean }>(child)) return <pre>{children}</pre>;
  const language = /language-([\w-]+)/.exec(child.props.className ?? "")?.[1]?.toLowerCase() ?? "";
  const source = String(child.props.children ?? "").replace(/\n$/, "");
  return <CodeBlock text={source} language={language} streaming={streaming} allowGraphic={child.props["data-graphic-allowed"] !== false} />;
};

// Stable component identities preserve an existing preview while more tokens arrive.
const components: Components = {
  a: ({ href, children }) => href && safeLink(href)
    ? <a href={safeLink(href)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a> : <span>{children}</span>,
  img: ({ alt }) => <span className="render-note">[Image omitted{alt ? `: ${alt}` : ""}]</span>,
  table: ({ children }) => <div className="table-scroll"><table>{children}</table></div>,
  code: InlineCode,
  pre: FencedCode,
};

export function RichText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const raw = <pre className="plain-text">{text.slice(0, MAX_PREVIEW_CHARACTERS)}</pre>;
  if (text.length > MAX_PREVIEW_CHARACTERS) return <><p className="render-note">Preview limited to 32,000 characters. Copy the message for its full text.</p>{raw}</>;
  return <RenderBoundary key={streaming ? "streaming" : text} fallback={raw}>
    <Streaming.Provider value={streaming}><div className="rich-text"><ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, [remarkLatexMath, { streaming }], remarkGraphicBudget]}
      skipHtml
      urlTransform={(url) => safeLink(url) ?? ""}
      components={components}
    >{text}</ReactMarkdown></div></Streaming.Provider>
  </RenderBoundary>;
}
