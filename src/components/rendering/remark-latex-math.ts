// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import type { Extension as FromMarkdownExtension, Handle } from "mdast-util-from-markdown";
import type { Construct, State } from "micromark-util-types";
import type {} from "remark-parse";
import type { Processor } from "unified";

declare module "micromark-util-types" {
  interface TokenTypeMap {
    openNookLatexMath: "openNookLatexMath";
    openNookLatexMathPending: "openNookLatexMathPending";
    openNookLatexMathData: "openNookLatexMathData";
  }
}

function latexMath(partial = false, dollar = false): Construct { return {
  name: "openNookLatexMath",
  tokenize(effects, ok, nok) {
    const previous = this.previous;
    let token: ReturnType<typeof effects.enter>;
    let closing = 0;
    let length = 0;
    let braces = 0;
    const consume = (code: number) => { effects.consume(code); length++; };
    const start: State = (code) => {
      if (code !== (dollar ? 36 : 92) || (dollar && previous === 36)) return nok(code);
      token = effects.enter("openNookLatexMath");
      effects.enter("openNookLatexMathData");
      consume(code);
      return opening;
    };
    const opening: State = (code) => {
      if (dollar) return code === 36 ? nok(code) : content(code);
      if (code !== 40 && code !== 91) return nok(code);
      closing = code === 40 ? 41 : 93;
      consume(code);
      return content;
    };
    const content: State = (code) => {
      if (length > (dollar ? 2001 : 2002)) return nok(code);
      if (code === null) return partial && length > (dollar ? 1 : 2) ? finish(code, true) : nok(code);
      if (dollar && code === 36) { consume(code); return finish(null, false); }
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
      if (code === null) return partial ? finish(code, true) : nok(code);
      if (!dollar && code === closing && braces === 0) {
        consume(code);
        return finish(null, false);
      }
      if (code === -5 || code === -4 || code === -3) return content(code);
      // Consuming escaped pairs together preserves TeX row breaks such as \\[2pt].
      consume(code);
      return content;
    };
    function finish(code: number | null, pending: boolean): ReturnType<State> {
      effects.exit("openNookLatexMathData");
      if (pending) token.type = "openNookLatexMathPending";
      effects.exit(token.type);
      return pending ? ok(code) : ok;
    }
    return start;
  },
}; }

const enterMath: Handle = function (token) {
  this.enter({ type: "inlineMath", value: "" }, token);
  this.buffer();
};
const exitMath: Handle = function (token) {
  const source = this.resume();
  const delimiter = source[0] === "$" ? 1 : 2;
  const value = source.slice(delimiter, token.type === "openNookLatexMathPending" ? undefined : -delimiter);
  const node = this.stack[this.stack.length - 1];
  if (node.type !== "inlineMath") throw new Error("Unexpected math node");
  node.value = value;
  node.data = {
    hName: "code",
    hProperties: { className: ["language-math", source[1] === "[" ? "math-display" : "math-inline"] },
    hChildren: [{ type: "text", value }],
  };
  this.exit(token);
};
const fromMarkdown: FromMarkdownExtension = {
  enter: { openNookLatexMath: enterMath, openNookLatexMathPending: enterMath },
  exit: {
    openNookLatexMathData(token) {
      this.config.enter.data.call(this, token);
      this.config.exit.data.call(this, token);
    },
    openNookLatexMath: exitMath,
    openNookLatexMathPending: exitMath,
  },
};

export function remarkLatexMath(this: Processor, { streaming = false }: { streaming?: boolean } = {}) {
  const data = this.data();
  // A Markdown syntax extension keeps code spans/fences and escaped delimiters literal.
  (data.micromarkExtensions ??= []).push({ text: { 92: latexMath(streaming), ...(streaming ? { 36: latexMath(true, true) } : {}) } });
  (data.fromMarkdownExtensions ??= []).push(fromMarkdown);
}
