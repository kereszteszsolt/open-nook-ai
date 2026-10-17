// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { publicModels, readAIConfiguration } from "@/server/ai/config";
import { GET } from "@/app/api/models/route";

describe("configured model registry", () => {
  it("trims slots, hides blanks and deduplicates in first-slot order", () => {
    const config = readAIConfiguration({
      OPENROUTER_API_KEY: " test-only-key ",
      OPENROUTER_MODEL_1: " test/one ", OPENROUTER_MODEL_2: " ",
      OPENROUTER_MODEL_3: "test/two:free", OPENROUTER_MODEL_4: "test/one",
      OPENROUTER_MODEL_5: "test/three", OPENROUTER_MODEL_6: "test/ignored",
    });
    expect(config.models).toEqual(["test/one", "test/two:free", "test/three"]);
    expect(publicModels(config)).toEqual({
      enabled: true, status: "ready", models: [
        { id: "test/one", label: "test/one" },
        { id: "test/two:free", label: "test/two:free" },
        { id: "test/three", label: "test/three" },
      ],
    });
  });

  it("never offers more than the five explicit slots", () => {
    const env = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`OPENROUTER_MODEL_${i + 1}`, `test/model-${i}`]));
    expect(readAIConfiguration(env).models).toHaveLength(5);
  });

  it.each([undefined, "", "   "])("disables all model choices without a key: %s", (key) => {
    expect(publicModels(readAIConfiguration({ OPENROUTER_API_KEY: key, OPENROUTER_MODEL_1: "test/one" })))
      .toEqual({ enabled: false, status: "missing_api_key", models: [] });
  });

  it("explains an empty registry and applies bounded defaults", () => {
    const config = readAIConfiguration({ OPENROUTER_API_KEY: "test-only-key" });
    expect(publicModels(config)).toEqual({ enabled: false, status: "missing_models", models: [] });
    expect(config.timeoutMs).toBe(60_000);
    expect(config.maxOutputTokens).toBe(2048);
  });

  it.each([
    { OPENROUTER_MODEL_1: "unqualified" },
    { OPENROUTER_MODEL_1: "https://private.invalid/secret" },
    { OPENROUTER_MODEL_1: "test/model\nAuthorization:secret" },
    { OPENROUTER_API_KEY: "test\nsecret" },
    { AI_REQUEST_TIMEOUT_MS: "999" },
    { AI_REQUEST_TIMEOUT_MS: "120001" },
    { AI_REQUEST_TIMEOUT_MS: "NaN" },
    { AI_MAX_OUTPUT_TOKENS: "0" },
    { AI_MAX_OUTPUT_TOKENS: "8193" },
    { AI_MAX_OUTPUT_TOKENS: "1.5" },
    { AI_MAX_OUTPUT_TOKENS: "" },
  ])("rejects invalid configuration with a generic error: %o", (env) => {
    expect(() => readAIConfiguration(env)).toThrow("AI configuration is invalid. Check the server settings.");
  });
});

describe("GET /api/models", () => {
  it("returns configured IDs/labels without secrets, settings or network access", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-private-key");
    vi.stubEnv("OPENROUTER_MODEL_1", "test/one");
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ enabled: true, status: "ready", models: [{ id: "test/one", label: "test/one" }] });
  });

  it("returns setup guidance with no provider key", async () => {
    vi.stubEnv("OPENROUTER_MODEL_1", "test/one");
    expect(await GET().json()).toEqual({ enabled: false, status: "missing_api_key", models: [] });
  });

  it("does not echo malformed configuration", async () => {
    vi.stubEnv("OPENROUTER_MODEL_1", "https://test-secret.invalid");
    const response = GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ enabled: false, status: "invalid_configuration", models: [] });
  });
});
