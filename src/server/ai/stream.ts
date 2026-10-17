// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import { createUIMessageStreamResponse, streamText, toUIMessageStream, type ModelMessage, type UIMessageChunk } from "ai";
import type { AIConfiguration } from "./config";
import type { ChatLifecycle } from "./lifecycle";
import type { FinalMessageStatus } from "@/shared/conversations";
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

export type TurnPersistence = {
  messageId: string;
  initialMetadata: { conversationId: string; version: number; status: "pending" };
  finish: (content: string, status: FinalMessageStatus, reason: string) => Promise<{ conversationId: string; version: number; status: FinalMessageStatus }>;
};

export function streamChat(
  configuration: AIConfiguration,
  model: string,
  messages: ModelMessage[],
  lifecycle: ChatLifecycle,
  persistence: TurnPersistence,
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
    generateMessageId: () => persistence.messageId,
    onError: () => lifecycle.publicError(),
  }).getReader();
  let content = "";
  let providerFailed = false;
  let saved: ReturnType<TurnPersistence["finish"]> | undefined;
  const settle = (status: FinalMessageStatus, reason: string) => saved ??= persistence.finish(content, status, reason);
  const interrupted = () => settle(lifecycle.reason === "cancelled" ? "stopped" : "failed",
    lifecycle.reason === "cancelled" ? "cancelled" : lifecycle.reason === "timeout" ? "timeout" : lifecycle.reason === "response_too_large" ? "output_limit" : "error");
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
      const terminate = async () => {
        let errorText = lifecycle.publicError();
        try { await interrupted(); } catch { errorText = "The response could not be saved. Reload saved history before continuing."; }
        if (closed) return;
        if (lifecycle.reason !== "cancelled") {
          controller.enqueue({ type: "error", errorText });
        }
        controller.enqueue({ type: "abort", reason: errorText });
        closed = true;
        controller.close();
        lifecycle.dispose();
        void reader.cancel().catch(() => {});
      };
      try {
        while (!closed) {
          const next = await reader.read();
          if (closed) return;
          if (lifecycle.signal.aborted) { await terminate(); return; }
          if (next.done) {
            if (!saved) { lifecycle.stop("provider_error"); await terminate(); return; }
            closed = true;
            controller.close();
            reader.releaseLock();
            lifecycle.dispose();
            return;
          }
          if (next.value.type === "finish" && (next.value.finishReason === "other" || next.value.finishReason === "tool-calls")) {
            lifecycle.stop("provider_error");
            await terminate();
            return;
          }
          // Forward text and lifecycle events only, without provider metadata or tool/file payloads.
          let chunk = publicChunk(next.value, lifecycle, textId);
          if (!chunk) continue;
          if (chunk.type === "start") chunk = { ...chunk, messageId: persistence.messageId, messageMetadata: persistence.initialMetadata };
          if (chunk.type === "error" || chunk.type === "abort") providerFailed = true;
          bytes += encoder.encode(JSON.stringify(chunk)).byteLength;
          if (bytes > MAX_OUTPUT_BYTES) {
            lifecycle.stop("response_too_large");
            await terminate();
            return;
          }
          if (chunk.type === "finish") {
            const status = !providerFailed && ["stop", "length"].includes(chunk.finishReason ?? "") && content.trim() ? "completed" : "failed";
            const metadata = await settle(status, chunk.finishReason ?? "error");
            if (metadata.status !== "completed") { lifecycle.stop("provider_error"); await terminate(); return; }
            chunk = { ...chunk, messageMetadata: metadata };
          }
          if (chunk.type === "text-delta") content += chunk.delta;
          controller.enqueue(chunk);
          return;
        }
      } catch {
        if (!closed) await terminate();
      }
    },
    async cancel() {
      closed = true;
      lifecycle.stop("cancelled");
      lifecycle.dispose();
      await interrupted().catch(() => {});
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
      await interrupted().catch(() => {});
      await encoded.cancel().catch(() => {});
    },
  }), { headers: response.headers });
}
