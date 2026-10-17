// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

export const context7Tools = {
  "resolve-library-id": "Find a documentation library by name.",
  "query-docs": "Look up documentation for a selected library.",
} as const;
export type Context7ToolName = keyof typeof context7Tools;

export const integrationSnapshot = z.object({
  id: z.literal("context7"),
  configured: z.boolean(),
  enabled: z.boolean(),
  status: z.enum(["not_configured", "invalid_configuration", "disabled", "connecting", "ready", "unavailable"]),
  tools: z.array(z.object({
    name: z.enum(["resolve-library-id", "query-docs"]),
    description: z.string().max(160),
  }).strict()).max(2),
  checkedAt: z.iso.datetime().nullable(),
  error: z.enum(["connection_failed", "timed_out", "invalid_metadata"]).nullable(),
}).strict();
export type IntegrationSnapshot = z.infer<typeof integrationSnapshot>;
