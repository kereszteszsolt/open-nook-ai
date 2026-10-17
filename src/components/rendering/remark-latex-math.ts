// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import type { Extension as FromMarkdownExtension } from "mdast-util-from-markdown";
import type { Construct, State } from "micromark-util-types";
import type {} from "remark-parse";
import type { Processor } from "unified";

declare module "micromark-util-types" {
  interface TokenTypeMap {
    openNookLatexMath: "openNookLatexMath";
    openNookLatexMathData: "openNookLatexMathData";
  }
}

const latexMath: Construct = {
  name: "openNookLatexMath",
  tokenize(effects, ok, nok) {
    let closing = 0;
    let length = 0;
    let braces = 0;
    const consume = (code: number) => { effects.consume(code); length++; };
    const start: State = (code) => {
      if (code !== 92) return nok(code);
      effects.enter("openNookLatexMath");
      effects.enter("openNookLatexMathData");
      consume(code);
      return opening;
    };
    const opening: State = (code) => {
      if (code !== 40 && code !== 91) return nok(code);
      closing = code === 40 ? 41 : 93;
      consume(code);
      return content;
    };
    const content: State = (code) => {
      if (code === null || length > 2002) return nok(code);
      if (code === -5 || code === -4 || code === -3) {
        effects.exit("openNookLatexMathData");
        effects.enter("lineEnding");
        consume(code);
        effects.exit("lineEnding");
        effects.enter("openNookLatexMathData");
        return content;
      }
      consume(code);
      if (code === 92) return escaped;
      if (code === 123) braces++;
      if (code === 125) braces = Math.max(0, braces - 1);
      return content;
    };
    const escaped: State = (code) => {
      if (code === null) return nok(code);
      if (code === closing && braces === 0) {
        consume(code);
        effects.exit("openNookLatexMathData");
        effects.exit("openNookLatexMath");
        return ok;
      }
      if (code === -5 || code === -4 || code === -3) return content(code);
      // Consuming escaped pairs together preserves TeX row breaks such as \\[2pt].
      consume(code);
      return content;
    };
    return start;
  },
};

const fromMarkdown: FromMarkdownExtension = {
  enter: {
    openNookLatexMath(token) {
      this.enter({ type: "inlineMath", value: "" }, token);
      this.buffer();
    },
  },
  exit: {
    openNookLatexMathData(token) {
      this.config.enter.data.call(this, token);
      this.config.exit.data.call(this, token);
    },
    openNookLatexMath(token) {
      const source = this.resume();
      const value = source.slice(2, -2);
      const node = this.stack[this.stack.length - 1];
      if (node.type !== "inlineMath") throw new Error("Unexpected math node");
      node.value = value;
      node.data = {
        hName: "code",
        hProperties: { className: ["language-math", source[1] === "[" ? "math-display" : "math-inline"] },
        hChildren: [{ type: "text", value }],
      };
      this.exit(token);
    },
  },
};

export function remarkLatexMath(this: Processor) {
  const data = this.data();
  // A Markdown syntax extension keeps code spans/fences and escaped delimiters literal.
  (data.micromarkExtensions ??= []).push({ text: { 92: latexMath } });
  (data.fromMarkdownExtensions ??= []).push(fromMarkdown);
}
