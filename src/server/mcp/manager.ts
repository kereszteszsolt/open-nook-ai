// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import "server-only";
import type { IntegrationSnapshot } from "@/shared/integrations";
import { DISCOVERY_TIMEOUT_MS, MCPDiscoveryError, readMCPConfiguration, type MCPConfiguration } from "./config";
import { discoverContext7 } from "./client";

type Discover = (configuration: MCPConfiguration, signal: AbortSignal) => Promise<IntegrationSnapshot["tools"]>;
export function createIntegrationManager(discover: Discover = discoverContext7, configure = readMCPConfiguration) {
  let snapshot: IntegrationSnapshot = { id: "context7", configured: false, enabled: false, status: "not_configured", tools: [], checkedAt: null, error: null };
  let settings = "";
  let revision = 0;
  let active: AbortController | undefined;
  function reset(status: IntegrationSnapshot["status"], configured: boolean) {
    revision++; active?.abort(); active = undefined;
    snapshot = { ...snapshot, configured, enabled: false, status, tools: [], checkedAt: null, error: null };
  }
  function configuration() {
    try {
      const config = configure();
      const key = JSON.stringify(config);
      if (key !== settings) { reset(config ? "disabled" : "not_configured", !!config); settings = key; }
      return config;
    } catch { settings = ""; reset("invalid_configuration", false); return null; }
  }
  return {
    status() { configuration(); return structuredClone(snapshot); },
    disable() { const config = configuration(); if (config) reset("disabled", true); return structuredClone(snapshot); },
    async enable(requestSignal: AbortSignal): Promise<IntegrationSnapshot> {
      const config = configuration();
      if (!config || snapshot.enabled) return structuredClone(snapshot);
      requestSignal.throwIfAborted();
      const current = ++revision;
      const controller = new AbortController(); active = controller;
      const cancel = () => controller.abort(requestSignal.reason);
      requestSignal.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(() => controller.abort(new DOMException("Discovery deadline exceeded", "TimeoutError")), DISCOVERY_TIMEOUT_MS);
      snapshot = { ...snapshot, status: "connecting", enabled: true, tools: [], checkedAt: null, error: null };
      let abort: () => void = () => {};
      try {
        const cancelled = new Promise<never>((_, reject) => {
          abort = () => reject(controller.signal.reason);
          controller.signal.addEventListener("abort", abort, { once: true });
        });
        const tools = await Promise.race([discover(config, controller.signal), cancelled]);
        if (current === revision) snapshot = { ...snapshot, status: "ready", tools, checkedAt: new Date().toISOString() };
      } catch (error) {
        if (current === revision) {
          const code = controller.signal.reason instanceof DOMException && controller.signal.reason.name === "TimeoutError"
            ? "timed_out" : error instanceof MCPDiscoveryError ? error.code : "connection_failed";
          snapshot = { ...snapshot, enabled: false, status: requestSignal.aborted ? "disabled" : "unavailable", tools: [], checkedAt: null,
            error: requestSignal.aborted ? null : code };
        }
      } finally {
        clearTimeout(timer); requestSignal.removeEventListener("abort", cancel);
        controller.signal.removeEventListener("abort", abort); controller.abort();
        if (current === revision) active = undefined;
      }
      return structuredClone(snapshot);
    },
  };
}

// The one-process localhost application deliberately starts disabled after every server restart.
const scope = globalThis as typeof globalThis & { openNookIntegration?: ReturnType<typeof createIntegrationManager> };
export const context7Integration = scope.openNookIntegration ??= createIntegrationManager();
