// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";
import { brand } from "@/shared/brand";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.appName,
  description: brand.appDescription,
  icons: brand.favicon ? { icon: { url: brand.favicon, type: "image/svg+xml" } } : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
