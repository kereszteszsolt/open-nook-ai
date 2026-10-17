// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import type { Conversation, Message } from "@/generated/prisma/client";
import { getDatabase } from "@/server/db";
import type { ConversationSummary, FinalMessageStatus, SavedConversation } from "@/shared/conversations";
import { ConversationError, conflict } from "./errors";

function summary(row: Conversation): ConversationSummary {
  return { id: row.id, title: row.title, version: row.version, active: !!row.activeRequestId,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
function detail(row: Conversation & { messages: Message[] }): SavedConversation {
  return { ...summary(row), messages: row.messages.map((message) => ({
    id: message.clientId, sequence: message.sequence, role: message.role, content: message.content,
    status: message.status, modelId: message.modelId,
    finishReason: message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
      && typeof message.metadata.finishReason === "string" ? message.metadata.finishReason : null,
  })) };
}
function missing(): never { throw new ConversationError(404, "conversation_not_found", "This saved chat no longer exists."); }

async function recoverExpired(id: string) {
  const database = getDatabase();
  await database.$transaction(async (tx) => {
    const result = await tx.conversation.updateMany({
      where: { id, activeRequestId: { not: null }, leaseExpiresAt: { lt: new Date() } },
      data: { activeRequestId: null, leaseExpiresAt: null, version: { increment: 1 } },
    });
    if (result.count) await tx.message.updateMany({
      where: { conversationId: id, status: "pending" },
      data: { status: "failed", metadata: { finishReason: "interrupted" } },
    });
  });
}

export async function createConversation() {
  return summary(await getDatabase().conversation.create({ data: {} }));
}
export async function listConversations(cursor?: string) {
  const rows = await getDatabase().conversation.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return { conversations: rows.slice(0, 20).map(summary), nextCursor: rows.length > 20 ? rows[19].id : null };
}
export async function getConversation(id: string) {
  await recoverExpired(id);
  const row = await getDatabase().conversation.findUnique({ where: { id }, include: { messages: { orderBy: { sequence: "asc" } } } });
  if (!row) missing();
  return detail(row);
}
export async function deleteConversation(id: string, version: number) {
  await recoverExpired(id);
  const result = await getDatabase().conversation.deleteMany({ where: { id, version, activeRequestId: null } });
  if (!result.count) {
    if (!await getDatabase().conversation.findUnique({ where: { id }, select: { id: true } })) missing();
    conflict();
  }
}

export type BeginTurn = {
  conversationId: string; version: number; requestId: string; model: string;
  user: { id: string; content: string }; regenerate: boolean; timeoutMs: number;
};
export type PreparedTurn = {
  conversationId: string; requestId: string; messageId: string; version: number;
  messages: { role: "user" | "assistant"; content: string }[];
};

export async function beginTurn(input: BeginTurn): Promise<PreparedTurn> {
  await recoverExpired(input.conversationId);
  return getDatabase().$transaction(async (tx) => {
    const row = await tx.conversation.findUnique({ where: { id: input.conversationId }, include: { messages: { orderBy: { sequence: "asc" } } } });
    if (!row) missing();
    if (row.version !== input.version || row.activeRequestId) conflict();
    const lastUser = row.messages.findLast((message) => message.role === "user");
    const last = row.messages.at(-1);
    if (input.regenerate && (!lastUser || last?.role !== "assistant" || lastUser.clientId !== input.user.id || lastUser.content !== input.user.content)) conflict();
    if (!input.regenerate && row.messages.some((message) => message.clientId === input.user.id)) conflict();
    if (!input.regenerate && row.messages.length + 2 > 32) {
      throw new ConversationError(413, "conversation_limit", "This chat reached its message limit. Start a new chat.");
    }
    const context = row.messages.filter((message) => message.status === "completed" && (!input.regenerate || message.id !== last?.id))
      .map((message) => ({ role: message.role, content: message.content }));
    if (!input.regenerate) context.push({ role: "user", content: input.user.content });
    if (!context.length || context.length > 32 || context.some((message) => message.content.length > 8000) || context.reduce((sum, message) => sum + message.content.length, 0) > 24_000) {
      throw new ConversationError(413, "conversation_limit", "This chat exceeds the context limit. Start a new chat.");
    }
    const locked = await tx.conversation.updateMany({
      where: { id: row.id, version: input.version, activeRequestId: null },
      data: { version: { increment: 1 }, activeRequestId: input.requestId,
        leaseExpiresAt: new Date(Date.now() + input.timeoutMs + 5000),
        ...(row.messages.length === 0 ? { title: input.user.content.replace(/\s+/g, " ").trim().slice(0, 80) } : {}),
      },
    });
    if (locked.count !== 1) conflict();
    const messageId = input.regenerate ? last!.clientId : crypto.randomUUID();
    if (input.regenerate) {
      await tx.message.update({ where: { id: last!.id }, data: { content: "", status: "pending", modelId: input.model, requestId: input.requestId, metadata: {} } });
    } else {
      const sequence = last ? last.sequence + 1 : 0;
      await tx.message.createMany({ data: [
        { conversationId: row.id, clientId: input.user.id, sequence, role: "user", content: input.user.content, status: "completed" },
        { conversationId: row.id, clientId: messageId, sequence: sequence + 1, role: "assistant", content: "", status: "pending", modelId: input.model, requestId: input.requestId },
      ] });
    }
    return { conversationId: row.id, requestId: input.requestId, messageId, version: input.version + 1, messages: context };
  });
}

const reasons = new Set(["stop", "length", "content-filter", "error", "cancelled", "timeout", "interrupted", "output_limit"]);
export async function finishTurn(turn: PreparedTurn, content: string, status: FinalMessageStatus, reason: string) {
  if (content.length > 524_288) throw new Error("Saved response exceeds its limit.");
  const finishReason = reasons.has(reason) ? reason : "error";
  const finalStatus = status === "completed" && (!content.trim() || !["stop", "length"].includes(finishReason)) ? "failed" : status;
  return getDatabase().$transaction(async (tx) => {
    const locked = await tx.conversation.updateMany({
      where: { id: turn.conversationId, activeRequestId: turn.requestId },
      data: { activeRequestId: null, leaseExpiresAt: null, version: { increment: 1 } },
    });
    if (locked.count !== 1) conflict();
    const updated = await tx.message.updateMany({
      where: { conversationId: turn.conversationId, clientId: turn.messageId, requestId: turn.requestId, status: "pending" },
      data: { content, status: finalStatus, metadata: { finishReason } },
    });
    if (updated.count !== 1) conflict();
    const row = await tx.conversation.findUniqueOrThrow({ where: { id: turn.conversationId } });
    return { conversationId: row.id, version: row.version, status: finalStatus };
  });
}
