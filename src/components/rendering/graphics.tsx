// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { assertMermaidSafety, parseChart, validateMermaid } from "./policy";
import { completeJson, mermaidCandidates } from "./preview";
import { sanitizeSvg } from "./sanitize-svg";

let mermaidModule: Promise<typeof import("mermaid")> | undefined;

type Result = { source: string; svg?: string; note?: string; failed?: boolean; waiting?: boolean };
export function Graphic({ source, kind, streaming = false }: { source: string; kind: "mermaid" | "vega-lite"; streaming?: boolean }) {
  const id = useId().replace(/[^a-z\d]/gi, "");
  const [result, setResult] = useState<Result>();
  const [snapshot, setSnapshot] = useState(source);
  const latest = useRef(source);
  const drawing = useRef(false);
  useEffect(() => { latest.current = source; }, [source]);
  useEffect(() => {
    if (!streaming) return;
    // Sample during continuous output too; a trailing debounce would wait until typing stops.
    const timer = setInterval(() => { if (!drawing.current) setSnapshot(latest.current); }, 250);
    return () => clearInterval(timer);
  }, [streaming]);
  const input = streaming ? snapshot : source;
  useEffect(() => {
    let active = true;
    let safe = true;
    drawing.current = true;
    const draw = async () => {
      if (kind === "mermaid") {
        try { assertMermaidSafety(input); } catch (error) { safe = false; throw error; }
        const { default: mermaid } = await (mermaidModule ??= import("mermaid"));
        mermaid.initialize({
          startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true,
          maxTextSize: 6000, maxEdges: 100, theme: "neutral", htmlLabels: false,
          secure: ["securityLevel", "startOnLoad", "maxTextSize", "maxEdges", "secure", "htmlLabels"],
        });
        let diagram: ReturnType<typeof validateMermaid> | undefined;
        for (const candidate of streaming ? mermaidCandidates(input) : [input]) {
          try {
            const prepared = validateMermaid(candidate);
            if (streaming && !await mermaid.parse(prepared.source, { suppressErrors: true })) continue;
            diagram = prepared; break;
          } catch { /* The next complete prefix may already be renderable. */ }
        }
        if (!diagram) throw new Error("Incomplete diagram");
        return { svg: sanitizeSvg((await mermaid.render(`diagram${id}`, diagram.source)).svg), note: diagram.note };
      }
      const spec = parseChart(streaming ? completeJson(input) : input);
      const [vega, { compile }, { expressionInterpreter }] = await Promise.all([
        import("vega"), import("vega-lite"), import("vega-interpreter"),
      ]);
      const compiled = compile(spec, { logger: vega.logger(vega.None) });
      const view = new vega.View(vega.parse(compiled.spec, undefined, { ast: true }), {
        renderer: "none", expr: expressionInterpreter,
        loader: {
          load: async () => { throw new Error("External chart data is disabled."); },
          sanitize: async () => { throw new Error("External chart resources are disabled."); },
          http: async () => { throw new Error("External chart data is disabled."); },
          file: async () => { throw new Error("External chart data is disabled."); },
        },
        logger: vega.logger(vega.None),
      });
      try { await view.runAsync(); return { svg: sanitizeSvg(await view.toSVG()) }; }
      finally { view.finalize(); }
    };
    void draw().then((graphic) => { if (active) setResult({ source: input, ...graphic }); })
      .catch(() => {
        if (active) setResult((previous) => streaming && safe
          ? { ...(previous?.svg ? { svg: previous.svg, note: previous.note } : {}), source: input, waiting: true }
          : { source: input, failed: true });
      }).finally(() => { drawing.current = false; });
    return () => { active = false; };
  }, [input, kind, id, streaming]);
  if (result?.failed && result.source === input) return <p className="render-warning" role="status">Preview unavailable. The source remains below; check the supported syntax and limits.</p>;
  if (!result?.svg || (!streaming && result.source !== input)) return <p role="status">{streaming ? "Waiting for a renderable preview…" : `Preparing ${kind === "mermaid" ? "diagram" : "chart"}…`}</p>;
  return <>
    {result.note && <p className="render-note" role="status">{result.note}</p>}
    {streaming && result.waiting && <p className="render-note">Updating preview…</p>}
    <div className="graphic" data-kind={kind} role="img" tabIndex={0} aria-busy={streaming} aria-label={kind === "mermaid" ? "Mermaid diagram" : "Vega-Lite chart"} dangerouslySetInnerHTML={{ __html: result.svg }} />
  </>;
}
