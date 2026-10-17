// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from "next";
import { brand } from "@/shared/branding";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.appName,
  applicationName: brand.appName,
  description: "A local home for thoughtful conversations with AI.",
  ...(brand.appFavicon || brand.appIcon ? {
    icons: {
      icon: brand.appFavicon || brand.appIcon,
      ...(brand.appIcon ? { apple: brand.appIcon } : {}),
    },
  } : {}),
  ...(brand.appPoster ? { openGraph: { siteName: brand.appName, images: [brand.appPoster] } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
