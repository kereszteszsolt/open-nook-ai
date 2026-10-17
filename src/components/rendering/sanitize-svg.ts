// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import DOMPurify from "dompurify";

export function sanitizeSvg(svg: string): string {
  if (svg.length > 1_000_000) throw new Error("The graphic is too large.");
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["foreignObject", "image", "a", "script", "animate", "set"],
    FORBID_ATTR: ["href", "xlink:href", "src"],
  });
  const document = new DOMParser().parseFromString(clean, "image/svg+xml");
  const root = document.documentElement;
  if (root.localName !== "svg" || document.querySelector("parsererror")) throw new Error("Invalid graphic.");
  for (const element of [root, ...root.querySelectorAll("*")]) {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || /(?:\\|https?:|data:|javascript:|@import|url\s*\(\s*[^#\s])/i.test(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }
    if (element.localName === "style" && /(?:\\|@import|url\s*\(\s*[^#\s])/i.test(element.textContent ?? "")) element.remove();
  }
  return new XMLSerializer().serializeToString(root);
}
