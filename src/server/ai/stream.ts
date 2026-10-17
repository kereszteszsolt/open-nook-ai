// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import { createUIMessageStreamResponse, streamText, toUIMessageStream, type ModelMessage, type UIMessageChunk } from "ai";
import type { AIConfiguration } from "./config";
import type { ChatLifecycle } from "./lifecycle";
import { configuredModel } from "./provider";

export const MAX_OUTPUT_BYTES = 512 * 1024;

function publicChunk(chunk: UIMessageChunk, lifecycle: ChatLifecycle, textId: (id: string) => string): UIMessageChunk | undefined {
  switch (chunk.type) {
    case "start": return { type: "start", messageId: chunk.messageId };
    case "text-start": return { type: "text-start", id: textId(chunk.id) };
    case "text-delta": return { type: "text-delta", id: textId(chunk.id), delta: chunk.delta };
    case "text-end": return { type: "text-end", id: textId(chunk.id) };
    case "start-step": return { type: "start-step" };
    case "finish-step": return { type: "finish-step" };
    case "finish": return { type: "finish", finishReason: chunk.finishReason };
    case "error": return { type: "error", errorText: lifecycle.publicError() };
    case "abort": return { type: "abort", reason: lifecycle.publicError() };
    default: return undefined;
  }
}

export function streamChat(
  configuration: AIConfiguration,
  model: string,
  messages: ModelMessage[],
  lifecycle: ChatLifecycle,
): Response {
  const result = streamText({
    model: configuredModel(configuration, model, lifecycle),
    messages,
    maxOutputTokens: configuration.maxOutputTokens,
    maxRetries: 0,
    streamRetries: 0,
    abortSignal: lifecycle.signal,
    telemetry: { isEnabled: false },
    onError: () => {},
  });
  const reader = toUIMessageStream({
    stream: result.stream,
    sendReasoning: false,
    sendSources: false,
    generateMessageId: () => crypto.randomUUID(),
    onError: () => lifecycle.publicError(),
  }).getReader();
  let closed = false;
  let bytes = 0;
  const encoder = new TextEncoder();
  const textIds = new Map<string, string>();
  const textId = (id: string) => {
    if (!textIds.has(id)) textIds.set(id, `text-${textIds.size}`);
    return textIds.get(id)!;
  };
  const body = new ReadableStream<UIMessageChunk>({
    async pull(controller) {
      const terminate = () => {
        if (lifecycle.reason !== "cancelled") {
          controller.enqueue({ type: "error", errorText: lifecycle.publicError() });
        }
        controller.enqueue({ type: "abort", reason: lifecycle.publicError() });
        closed = true;
        controller.close();
        lifecycle.dispose();
        void reader.cancel().catch(() => {});
      };
      try {
        while (!closed) {
          const next = await reader.read();
          if (closed) return;
          if (lifecycle.signal.aborted) { terminate(); return; }
          if (next.done) {
            closed = true;
            controller.close();
            reader.releaseLock();
            lifecycle.dispose();
            return;
          }
          if (next.value.type === "finish" && (next.value.finishReason === "other" || next.value.finishReason === "tool-calls")) {
            lifecycle.stop("provider_error");
            terminate();
            return;
          }
          // Forward text and lifecycle events only, without provider metadata or tool/file payloads.
          const chunk = publicChunk(next.value, lifecycle, textId);
          if (!chunk) continue;
          bytes += encoder.encode(JSON.stringify(chunk)).byteLength;
          if (bytes > MAX_OUTPUT_BYTES) {
            lifecycle.stop("response_too_large");
            terminate();
            return;
          }
          controller.enqueue(chunk);
          return;
        }
      } catch {
        if (!closed) terminate();
      }
    },
    async cancel() {
      closed = true;
      lifecycle.stop("cancelled");
      lifecycle.dispose();
      await reader.cancel().catch(() => {});
    },
  });
  const response = createUIMessageStreamResponse({
    stream: body,
    headers: { "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
  const encoded = response.body!.getReader();
  let ended = false;
  return new Response(new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await encoded.read();
        if (ended) return;
        if (next.done) { ended = true; encoded.releaseLock(); controller.close(); }
        else controller.enqueue(next.value);
      } catch {
        if (ended) return;
        ended = true;
        const message = lifecycle.publicError();
        lifecycle.stop("cancelled");
        lifecycle.dispose();
        controller.error(new Error(message));
      }
    },
    async cancel() {
      ended = true;
      // Abort before cancelling the SDK's encoding pipeline, which propagates cancellation asynchronously.
      lifecycle.stop("cancelled");
      lifecycle.dispose();
      await encoded.cancel().catch(() => {});
    },
  }), { headers: response.headers });
}
