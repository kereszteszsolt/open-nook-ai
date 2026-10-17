// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

export const MAX_PREVIEW_CHARACTERS = 32_000;
export const MAX_DIAGRAM_CHARACTERS = 6000;
export const MAX_CODE_CHARACTERS = 12_000;

export function safeLink(value: string): string | undefined {
  if (value.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function assertMermaidSafety(source: string): void {
  if (!source.trim() || source.length > MAX_DIAGRAM_CHARACTERS ||
    !/^(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram|pie)\b/.test(source.trim()) ||
    /%%\{|^\s*---|<[a-z/!]|\b(?:click|href|callback|style|classDef|linkStyle|image|icon)\b|url\s*\(|(?:https?|javascript|data|file):|@\{/im.test(source)) {
    throw new Error("This diagram uses unsupported or unsafe syntax.");
  }
  const statements = source.split(/[\n;]/);
  if (statements.length > 100) throw new Error("This diagram is too large.");
}

export function validateMermaid(source: string): { source: string; note?: string } {
  assertMermaidSafety(source);
  if (!/^pie\b/.test(source.trim())) return { source };
  return preparePie(source);
}

function preparePie(source: string): { source: string; note?: string } {
  const unsupported = () => { throw new Error("Use a pie title and quoted labels with positive numeric values."); };
  const lines = source.trim().split(/\r?\n/);
  const header = /^pie(?:[ \t]+showData)?(?:[ \t]+title[ \t]+(.+))?$/.exec(lines[0].trim());
  if (!header) return unsupported();
  let titleSeen = !!header[1];
  const labels = new Set<string>();
  let total = 0;
  let percentageValues = 0;
  const normalized = lines.map((line, index) => {
    if (index === 0 || !line.trim() || /^\s*%%/.test(line)) return line;
    if (/^\s*title\b/.test(line)) {
      if (titleSeen || labels.size || !/^\s*title[ \t]+\S/.test(line)) return unsupported();
      titleSeen = true;
      return line;
    }
    const entry = /^[ \t]*"([^"\\\r\n]{1,200})"[ \t]*:[ \t]*(\d+(?:\.\d{1,2})?)[ \t]*(%?)[ \t]*$/.exec(line);
    if (!entry || !entry[1].trim()) return unsupported();
    const value = Number(entry[2]);
    if (!Number.isFinite(value) || value <= 0 || value > 1e12 || labels.has(entry[1].trim())) return unsupported();
    labels.add(entry[1].trim());
    total += value;
    if (entry[3]) percentageValues++;
    // Only normalize a complete numeric entry; keep the original message and Copy source untouched.
    return line.replace(/%(?=[ \t]*$)/, "");
  });
  if (!labels.size || (percentageValues > 0 && percentageValues !== labels.size)) return unsupported();
  const note = percentageValues && Math.abs(total - 100) > 0.005
    ? `Values total ${Number(total.toFixed(2))}%; slices show their share of this total.` : undefined;
  return { source: normalized.join("\n"), ...(note ? { note } : {}) };
}

const field = z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_ ]*$/)
  .refine((value) => !["__proto__", "prototype", "constructor"].includes(value));
const encoding = z.object({
  field,
  type: z.enum(["quantitative", "nominal", "ordinal", "temporal"]),
  title: z.string().max(100).optional(),
}).strict();
const chartSchema = z.object({
  $schema: z.literal("https://vega.github.io/schema/vega-lite/v6.json").optional(),
  title: z.string().max(120).optional(),
  mark: z.enum(["bar", "line", "point", "area"]),
  data: z.object({ values: z.array(z.record(field, z.union([z.string().max(200), z.number().finite().min(-1e12).max(1e12), z.null()])))
    .min(1).max(500).refine((rows) => rows.every((row) => Object.keys(row).length <= 12)) }).strict(),
  encoding: z.object({ x: encoding, y: encoding, color: encoding.optional() }).strict(),
  width: z.number().int().min(160).max(640).optional(),
  height: z.number().int().min(120).max(400).optional(),
}).strict().superRefine((spec, context) => {
  for (const channel of Object.values(spec.encoding)) {
    if (!spec.data.values.every((row) => Object.hasOwn(row, channel.field))) {
      context.addIssue({ code: "custom", message: "Chart fields must exist in every row." });
    }
    if (channel.type === "quantitative" && !spec.data.values.every((row) => typeof row[channel.field] === "number")) {
      context.addIssue({ code: "custom", message: "Quantitative chart fields must be numeric." });
    }
  }
});

export function parseChart(source: string) {
  if (source.length > MAX_PREVIEW_CHARACTERS) throw new Error("This chart is too large.");
  const result = chartSchema.safeParse(JSON.parse(source));
  if (!result.success) throw new Error("Use a bounded chart with inline data and x/y fields.");
  return { ...result.data, width: result.data.width ?? 480, height: result.data.height ?? 260 };
}
