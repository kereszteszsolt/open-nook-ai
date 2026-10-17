// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

export const conversationSummary = z.object({
  id: z.uuid(), title: z.string().max(80), version: z.number().int().nonnegative(),
  active: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
export const savedMessage = z.object({
  id: z.string().min(1).max(128), sequence: z.number().int().nonnegative(),
  role: z.enum(["user", "assistant"]), content: z.string().max(524_288),
  status: z.enum(["pending", "completed", "stopped", "failed"]),
  modelId: z.string().nullable(), finishReason: z.string().nullable(),
});
export const savedConversation = conversationSummary.extend({ messages: z.array(savedMessage).max(32) });
export const conversationPage = z.object({ conversations: z.array(conversationSummary).max(20), nextCursor: z.uuid().nullable() });
export type ConversationSummary = z.infer<typeof conversationSummary>;
export type SavedConversation = z.infer<typeof savedConversation>;
export type SavedMessage = z.infer<typeof savedMessage>;
export type FinalMessageStatus = Exclude<SavedMessage["status"], "pending">;
