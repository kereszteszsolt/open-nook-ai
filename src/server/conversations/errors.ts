// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

export class ConversationError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export function conflict(): never {
  throw new ConversationError(409, "conversation_changed", "This chat changed or a request is still running. Reload saved history before trying again.");
}
