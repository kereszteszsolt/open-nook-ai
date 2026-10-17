// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RichText } from "@/components/rendering/rich-text";
import { MathText } from "@/components/rendering/math";
import { sanitizeSvg } from "@/components/rendering/sanitize-svg";
import { CopyButton } from "@/components/rendering/copy-button";
import { latexAnswer } from "./fixtures/math";

afterEach(cleanup);

describe("safe React content rendering", () => {
  it("renders GFM tables, tasks, ordinary links and highlighted inert code", () => {
    const { container } = render(<RichText text={'# Answer\n\n| A | B |\n| - | - |\n| One | Two |\n\n- [x] Done\n\n[Read](https://example.com)\n\n```javascript\nconst value = "<script>evil()</script>";\n```'} />);
    expect(screen.getByRole("heading", { name: "Answer" })).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(container.querySelector('input[type="checkbox"]')?.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("link", { name: "Read" }).getAttribute("rel")).toContain("noopener");
    expect(container.querySelector(".token.keyword")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeTruthy();
  });
  it("omits raw HTML, scripts, unsafe links and images without remote loads", () => {
    const { container } = render(<RichText text={'<script>window.attacked=true</script>\n\n<img src="https://private.invalid/secret" onerror="alert(1)">\n\n[Attack](javascript:alert%281%29)\n\n![tracking](https://private.invalid/pixel)\n\nSafe text'} />);
    expect(container.querySelector("script,img,iframe,object")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("Safe text")).toBeTruthy();
    expect(screen.getByText(/Image omitted/)).toBeTruthy();
  });
  it("renders trusted-false inline and display math", () => {
    const { container } = render(<RichText text={'Inline $x^2$\n\n$$\nE=mc^2\n$$'} />);
    expect(container.querySelectorAll(".katex").length).toBe(2);
    expect(container.querySelector(".math-display")).toBeTruthy();
  });
  it.each([String.raw`\href{javascript:alert(1)}{go}`, String.raw`\includegraphics{https://private.invalid/pixel}`, String.raw`\htmlStyle{background:url(https://private.invalid)}{x}`, String.raw`\def\a{\a}\a`, "{" ])("contains hostile or invalid math %#", (text) => {
    const { container } = render(<MathText text={text} />);
    expect(container.querySelector("a,img,script,[style*=url]")).toBeNull();
    expect(container.textContent?.length).toBeLessThan(10000);
  });
  it("keeps partial code/diagram/math streams inert until completion", () => {
    const { container } = render(<RichText streaming text={'```mermaid\nflowchart LR\nA[unfinished\n\n$partial'} />);
    expect(container.querySelector("svg,.token,.katex")).toBeNull();
    expect(screen.getByText(/Preview appears when/)).toBeTruthy();
    expect(screen.getByText(/A\[unfinished/)).toBeTruthy();
  });
  it("contains a malformed diagram without losing surrounding conversation text", async () => {
    render(<RichText text={'Before\n\n```mermaid\nunsafe unknown diagram\n```\n\nAfter'} />);
    await screen.findByText(/Preview unavailable/);
    expect(screen.getByText("Before")).toBeTruthy();
    expect(screen.getByText("After")).toBeTruthy();
    expect(screen.getByText("unsafe unknown diagram")).toBeTruthy();
  });
  it("contains malformed chart JSON", async () => {
    render(<RichText text={'```vega-lite\n{partial\n```'} />);
    await screen.findByText(/Preview unavailable/);
    expect(screen.getByText("{partial")).toBeTruthy();
  });
  it("bounds previews while retaining safe text", () => {
    const { container } = render(<RichText text={"x".repeat(32001)} />);
    expect(screen.getByText(/Preview limited/)).toBeTruthy();
    expect(container.querySelector("pre")?.textContent?.length).toBe(32000);
  });
});

describe("graphic SVG sanitization", () => {
  it("removes executable, linked and external resources including root styles", () => {
    const svg = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="evil()" style="background:url(https://private.invalid)"><script>evil()</script><foreignObject><img src="https://private.invalid"/></foreignObject><image href="https://private.invalid"/><a href="javascript:evil()"><text>Label</text></a><style>@import url(https://private.invalid);</style><rect width="10" height="20" onclick="evil()"/><text>Safe</text></svg>');
    const document = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(document.querySelector("script,foreignObject,image,a,style")).toBeNull();
    expect(svg).not.toMatch(/onload|onclick|private.invalid|javascript:/);
    expect(document.querySelector("rect")).toBeTruthy();
    expect(svg).toContain("Safe");
  });
  it("retains ordinary geometry and local marker references", () => {
    const svg = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow"/></defs><path d="M0 0L10 10" marker-end="url(#arrow)"/></svg>');
    expect(svg).toContain('marker-end="url(#arrow)"');
  });
  it("rejects CSS escapes that could conceal external resource functions", () => {
    const svg = sanitizeSvg(String.raw`<svg xmlns="http://www.w3.org/2000/svg"><style>rect {fill:u\72l(//private.invalid/x)}</style><rect width="10" height="10" style="fill:u\72l(//private.invalid/x)"/></svg>`);
    expect(svg).not.toContain("private.invalid");
    expect(svg).not.toContain("style");
    expect(svg).toContain("rect");
  });
});

describe("copy controls", () => {
  it("copies exact text without evaluating it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CopyButton label="Copy code" text={'<script>evil()</script>\n'} />);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByText("Copied");
    expect(writeText).toHaveBeenCalledWith('<script>evil()</script>\n');
  });
  it("reports clipboard failure without breaking the message", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    render(<CopyButton label="Copy message" text="Answer" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Select the text"));
  });
});


it("renders backslash-delimited cases, matrices, aligned rows and inline formulas", () => {
  const { container } = render(<RichText text={latexAnswer} />);
  expect(container.querySelectorAll(".katex")).toHaveLength(8);
  expect(container.querySelectorAll(".math-display .katex")).toHaveLength(3);
  expect(container.querySelectorAll(".render-fallback")).toHaveLength(0);
  const annotations = [...container.querySelectorAll('annotation[encoding="application/x-tex"]')].map((node) => node.textContent);
  expect(annotations[0]).toContain(String.raw`4\\[2pt]`);
  expect(annotations[1]).toContain(String.raw`\begin{pmatrix}`);
  expect(annotations[2]).toContain(String.raw`\begin{aligned}`);
});

it("keeps formula examples in code and escaped delimiters literal", () => {
  const text = ["`\\(x\\)`", "```tex\n\\[x\\]\n```", "    \\(x\\)", String.raw`\\(x\\)`].join("\n\n");
  const { container } = render(<RichText text={text} />);
  expect(container.querySelector(".katex")).toBeNull();
  expect(container.querySelectorAll("pre code")).toHaveLength(2);
  expect(container.querySelector("code")?.textContent).toBe(String.raw`\(x\)`);
});

it("preserves TeX row spacing in quotes/lists and accepts existing dollar delimiters", () => {
  const text = String.raw`> \[
> \begin{matrix}1&2\\[2pt]3&4\end{matrix}
> \]

- \(x^2\) and $y^2$

$$
z^2
$$`;
  const { container } = render(<RichText text={text} />);
  expect(container.querySelectorAll(".katex")).toHaveLength(4);
  const first = container.querySelector("annotation")?.textContent;
  expect(first).toContain(String.raw`1&2\\[2pt]3&4`);
  expect(first).not.toContain(">");
});

it.each([String.raw`\(unfinished`, String.raw`\[x`, "\\(" + "x".repeat(2001) + "\\)"])("keeps incomplete/oversized backslash math readable %#", (text) => {
  const { container } = render(<RichText text={text + "\n\nSurvives"} />);
  expect(container.querySelector(".katex")).toBeNull();
  expect(container.textContent).toContain("Survives");
  expect(container.querySelector(".plain-text")).toBeNull();
});

it("contains hostile backslash math and keeps complete streamed formulas inert", () => {
  const text = String.raw`\(\includegraphics{https://private.invalid/x}\) and \[\href{javascript:alert(1)}{go}\]`;
  const { container, rerender } = render(<RichText text={text} />);
  expect(container.querySelector("a,img,script,[style*=url]")).toBeNull();
  expect(container.querySelectorAll(".katex")).toHaveLength(2);
  rerender(<RichText text={latexAnswer} streaming />);
  expect(container.querySelector(".katex")).toBeNull();
});
