// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  for (const key of ["OPENROUTER_API_KEY", ...Array.from({ length: 5 }, (_, i) => `OPENROUTER_MODEL_${i + 1}`),
    "AI_REQUEST_TIMEOUT_MS", "AI_MAX_OUTPUT_TOKENS", "MCP_CONTEXT7_URL", "MCP_CONTEXT7_API_KEY", "MCP_CONTEXT7_ALLOWED_TOOLS"]) vi.stubEnv(key, undefined);
  vi.stubGlobal("fetch", () => { throw new Error("Network calls must be explicitly mocked in tests."); });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
