// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useRef, useState } from "react";
import { integrationSnapshot, type IntegrationSnapshot } from "@/shared/integrations";

const labels: Record<IntegrationSnapshot["status"], string> = {
  not_configured: "Not configured", invalid_configuration: "Configuration needs attention",
  disabled: "Disabled", connecting: "Discovering tools…", ready: "Tools discovered", unavailable: "Unavailable",
};
export function Context7Integration() {
  const [snapshot, setSnapshot] = useState<IntegrationSnapshot>();
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<"enable" | "disable" | "status" | null>("status");
  const active = useRef<AbortController | null>(null);
  const request = async (action?: "enable" | "disable") => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setPending(action ?? "status"); setFailed(false);
    if (action === "enable") setSnapshot((old) => old && ({ ...old, enabled: true, status: "connecting", tools: [], error: null }));
    try {
      const response = await fetch("/api/integrations/context7", {
        method: action ? "POST" : "GET", cache: "no-store", signal: controller.signal,
        ...(action ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) } : {}),
      });
      const value = integrationSnapshot.parse(await response.json());
      if (!controller.signal.aborted) setSnapshot(value);
    } catch { if (!controller.signal.aborted) setFailed(true); }
    finally { if (!controller.signal.aborted) setPending(null); }
  };
  useEffect(() => {
    const controller = new AbortController(); active.current = controller;
    void fetch("/api/integrations/context7", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json()).then((value) => { if (!controller.signal.aborted) setSnapshot(integrationSnapshot.parse(value)); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setPending(null); });
    return () => { controller.abort(); active.current?.abort(); };
  }, []);
  return <details className="integration-control">
    <summary>Integrations</summary>
    <section className="integration-panel" aria-label="Context7 integration">
      <h2>Context7 documentation</h2>
      <p>Discover read-only documentation tools. Enabling contacts Context7; no chat content is sent.</p>
      <p role="status" aria-live="polite">{snapshot ? labels[snapshot.status] : pending ? "Loading status…" : "Status unavailable"}</p>
      {snapshot && !snapshot.configured && <p>Configure the trusted connection on the server before enabling it.</p>}
      {snapshot?.status === "unavailable" && <p role="alert">{snapshot.error === "timed_out" ? "Discovery timed out." : "Tools could not be discovered."} Check the connection and try again.</p>}
      {failed && <p role="alert">Integration status could not be updated. Refresh status and try again.</p>}
      <div className="integration-actions">
        {snapshot?.enabled
          ? <button type="button" className="quiet-button" disabled={pending === "disable"} onClick={() => { void request("disable"); }}>Disable Context7</button>
          : <button type="button" className="primary-button" disabled={!snapshot?.configured || pending !== null} onClick={() => { void request("enable"); }}>Enable Context7</button>}
        <button type="button" className="quiet-button" disabled={pending !== null} onClick={() => { void request(); }}>Refresh status</button>
      </div>
      {!!snapshot?.tools.length && <ul>{snapshot.tools.map((tool) => <li key={tool.name}><code>{tool.name}</code><p>{tool.description}</p></li>)}</ul>}
      {snapshot?.checkedAt && <p>Last discovered: <time dateTime={snapshot.checkedAt}>{new Date(snapshot.checkedAt).toLocaleString()}</time></p>}
      <p className="message-state">Discovery only. These tools are not executed by chat.</p>
    </section>
  </details>;
}
