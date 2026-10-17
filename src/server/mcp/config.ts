// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import { context7Tools, type Context7ToolName } from "@/shared/integrations";

export const CONTEXT7_ENDPOINT = "https://mcp.context7.com/mcp";
export const DISCOVERY_TIMEOUT_MS = 10_000;
export const MAX_MCP_RESPONSE_BYTES = 64 * 1024;
export type MCPConfiguration = { endpoint: string; apiKey: string; allowedTools: Context7ToolName[] };

export function readMCPConfiguration(env: Readonly<Record<string, string | undefined>> = process.env): MCPConfiguration | null {
  const endpoint = env.MCP_CONTEXT7_URL?.trim() ?? "";
  if (!endpoint) return null;
  const apiKey = env.MCP_CONTEXT7_API_KEY?.trim() ?? "";
  const allowedTools = [...new Set((env.MCP_CONTEXT7_ALLOWED_TOOLS ?? Object.keys(context7Tools).join(","))
    .split(",").map((name) => name.trim()))];
  if (endpoint !== CONTEXT7_ENDPOINT || (apiKey && !/^[\x21-\x7e]{1,1024}$/.test(apiKey))
    || !allowedTools.length || allowedTools.some((name) => !Object.hasOwn(context7Tools, name))) {
    throw new Error("MCP configuration is invalid. Check the server settings.");
  }
  return { endpoint, apiKey, allowedTools: allowedTools as Context7ToolName[] };
}

export class MCPDiscoveryError extends Error {
  constructor(public readonly code: "connection_failed" | "timed_out" | "invalid_metadata" = "connection_failed") {
    super("Context7 discovery could not be completed.");
  }
}
