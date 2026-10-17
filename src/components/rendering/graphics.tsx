// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useId, useState } from "react";
import { parseChart, validateMermaid } from "./policy";
import { sanitizeSvg } from "./sanitize-svg";

export function Graphic({ source, kind }: { source: string; kind: "mermaid" | "vega-lite" }) {
  const id = useId().replace(/[^a-z\d]/gi, "");
  const [result, setResult] = useState<{ source: string; svg?: string; failed?: boolean }>();
  useEffect(() => {
    let active = true;
    const draw = async () => {
      if (kind === "mermaid") {
        validateMermaid(source);
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true,
          maxTextSize: 6000, maxEdges: 100, theme: "neutral",
          htmlLabels: false,
          secure: ["securityLevel", "startOnLoad", "maxTextSize", "maxEdges", "secure", "htmlLabels"],
        });
        return sanitizeSvg((await mermaid.render(`diagram${id}`, source)).svg);
      }
      const spec = parseChart(source);
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
      try { await view.runAsync(); return sanitizeSvg(await view.toSVG()); }
      finally { view.finalize(); }
    };
    void draw().then((svg) => { if (active) setResult({ source, svg }); })
      .catch(() => { if (active) setResult({ source, failed: true }); });
    return () => { active = false; };
  }, [source, kind, id]);
  if (!result || result.source !== source) return <p role="status">Preparing {kind === "mermaid" ? "diagram" : "chart"}…</p>;
  if (result.failed) return <p className="render-warning" role="status">Preview unavailable. The source remains below; check the supported syntax and limits.</p>;
  return <div className="graphic" data-kind={kind} role="img" tabIndex={0} aria-label={kind === "mermaid" ? "Mermaid diagram" : "Vega-Lite chart"} dangerouslySetInnerHTML={{ __html: result.svg! }} />;
}
