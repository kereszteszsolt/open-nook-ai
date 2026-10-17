// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { AIConfiguration } from "./config";
import type { ChatLifecycle } from "./lifecycle";

export const MAX_PROVIDER_BYTES = 2 * 1024 * 1024;
const endpoint = "https://openrouter.ai/api/v1/chat/completions";

export function configuredModel(configuration: AIConfiguration, model: string, lifecycle: ChatLifecycle) {
  if (!configuration.models.includes(model) || !configuration.apiKey) {
    throw new Error("Model is not configured.");
  }
  const openrouter = createOpenRouter({
    apiKey: configuration.apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    compatibility: "strict",
    fetch: async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url !== endpoint) throw new Error("Unexpected provider endpoint.");
      const response = await fetch(input, { ...init, redirect: "error" });
      if (response.status >= 300 && response.status < 400) {
        void response.body?.cancel().catch(() => {});
        throw new Error("Provider redirect denied.");
      }
      if (!response.body) return response;
      const reader = response.body.getReader();
      let bytes = 0;
      let ended = false;
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const next = await reader.read();
            if (ended) return;
            if (next.done) { ended = true; controller.close(); reader.releaseLock(); return; }
            bytes += next.value.byteLength;
            if (bytes > MAX_PROVIDER_BYTES) {
              ended = true;
              lifecycle.stop("response_too_large");
              void reader.cancel().catch(() => {});
              controller.close();
              return;
            }
            controller.enqueue(next.value);
          } catch {
            if (ended) return;
            ended = true;
            lifecycle.stop("provider_error");
            // The shared abort signal carries failure; closing avoids rejected SDK decoder branches.
            controller.close();
            reader.releaseLock();
          }
        },
        async cancel() {
          ended = true;
          try { await reader.cancel(); } finally { reader.releaseLock(); }
        },
      });
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    },
  });
  return openrouter.chat(model, { provider: { allow_fallbacks: false, require_parameters: true } });
}
