// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

type StopReason = "timeout" | "cancelled" | "response_too_large" | "provider_error";

export function createChatLifecycle(clientSignal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  let reason: StopReason | undefined;
  const stop = (nextReason: StopReason) => {
    if (controller.signal.aborted) return;
    reason = nextReason;
    controller.abort(new DOMException("Generation stopped", "AbortError"));
  };
  const onClientAbort = () => stop("cancelled");
  const timer = setTimeout(() => stop("timeout"), timeoutMs);
  clientSignal.addEventListener("abort", onClientAbort, { once: true });
  if (clientSignal.aborted) onClientAbort();

  return {
    signal: controller.signal,
    stop,
    get reason() { return reason; },
    dispose() {
      clearTimeout(timer);
      clientSignal.removeEventListener("abort", onClientAbort);
    },
    publicError() {
      if (reason === "timeout") return "The model request timed out. Try again.";
      if (reason === "response_too_large") return "The model response exceeded the output limit.";
      if (reason === "cancelled") return "Generation stopped.";
      return "The model request failed. Try again.";
    },
  };
}

export type ChatLifecycle = ReturnType<typeof createChatLifecycle>;
