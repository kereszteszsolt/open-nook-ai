// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const modelId = z.string().max(200).regex(/^[a-z\d][a-z\d._-]*\/[a-z\d][a-z\d._:/-]*$/i);
const settings = z.object({
  apiKey: z.string().max(1024).regex(/^[\x21-\x7e]*$/),
  models: z.array(modelId).max(5),
  timeoutMs: z.coerce.number().int().min(1000).max(120_000),
  maxOutputTokens: z.coerce.number().int().min(1).max(8192),
});

export type AIConfiguration = z.infer<typeof settings>;

export class AIConfigurationError extends Error {
  constructor() {
    super("AI configuration is invalid. Check the server settings.");
  }
}

export function readAIConfiguration(environment: Readonly<Record<string, string | undefined>> = process.env): AIConfiguration {
  const models = Array.from(new Set(
    Array.from({ length: 5 }, (_, index) => environment[`OPENROUTER_MODEL_${index + 1}`]?.trim())
      .filter((value): value is string => Boolean(value)),
  ));
  const parsed = settings.safeParse({
    apiKey: environment.OPENROUTER_API_KEY?.trim() ?? "",
    models,
    timeoutMs: environment.AI_REQUEST_TIMEOUT_MS ?? 60_000,
    maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS ?? 2048,
  });
  if (!parsed.success) throw new AIConfigurationError();
  return parsed.data;
}

export function publicModels(configuration: AIConfiguration) {
  const status = !configuration.apiKey
    ? "missing_api_key"
    : configuration.models.length === 0 ? "missing_models" : "ready";
  return {
    enabled: status === "ready",
    status,
    models: status === "ready"
      ? configuration.models.map((id) => ({ id, label: id }))
      : [],
  };
}
