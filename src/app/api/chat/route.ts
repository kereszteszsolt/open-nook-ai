// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { AIConfigurationError, publicModels, readAIConfiguration } from "@/server/ai/config";
import { createChatLifecycle, type ChatLifecycle } from "@/server/ai/lifecycle";
import { ChatRequestError, readChatRequest } from "@/server/ai/request";
import { beginTurn, finishTurn, type PreparedTurn } from "@/server/conversations/store";
import { sameOrigin, storageError } from "@/server/conversations/http";
import { ConversationError } from "@/server/conversations/errors";
import { streamChat } from "@/server/ai/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  let lifecycle: ChatLifecycle | undefined;
  let turn: PreparedTurn | undefined;
  try {
    sameOrigin(request);
    const configuration = readAIConfiguration();
    if (!publicModels(configuration).enabled) {
      return errorResponse(503, "ai_not_configured", "Configure an OpenRouter API key and at least one model.");
    }
    lifecycle = createChatLifecycle(request.signal, configuration.timeoutMs);
    const input = await readChatRequest(request, lifecycle.signal);
    if (!configuration.models.includes(input.model)) {
      lifecycle.dispose();
      return errorResponse(400, "model_not_allowed", "Select a configured model.");
    }
    turn = await beginTurn({ ...input, timeoutMs: configuration.timeoutMs });
    lifecycle.signal.throwIfAborted();
    const prepared = turn;
    return streamChat(configuration, input.model, prepared.messages, lifecycle, {
      messageId: prepared.messageId,
      initialMetadata: { conversationId: prepared.conversationId, version: prepared.version, status: "pending" },
      finish: (content, status, reason) => finishTurn(prepared, content, status, reason),
    });
  } catch (error) {
    lifecycle?.dispose();
    if (turn) await finishTurn(turn, "", lifecycle?.reason === "cancelled" ? "stopped" : "failed", lifecycle?.reason === "cancelled" ? "cancelled" : lifecycle?.reason === "timeout" ? "timeout" : "error").catch(() => {});
    if (error instanceof ConversationError) return storageError(error);
    if (error instanceof AIConfigurationError) return errorResponse(503, "invalid_configuration", error.message);
    if (error instanceof ChatRequestError) return errorResponse(error.status, error.code, error.message);
    if (lifecycle?.reason === "timeout") return errorResponse(408, "request_timeout", "The chat request timed out.");
    if (lifecycle?.reason === "cancelled") return errorResponse(499, "request_cancelled", "The chat request was cancelled.");
    return storageError(error);
  }
}
