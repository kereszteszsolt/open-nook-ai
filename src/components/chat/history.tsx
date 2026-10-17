// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { brand } from "@/shared/branding";
import type { ConversationSummary, SavedConversation } from "@/shared/conversations";
import { loadChat, loadHistory, removeChat, selectChatUrl } from "./history-client";
import { Context7Integration } from "../integrations/context7";

type SessionProps = { initial?: SavedConversation; onSaved: () => void; onBusy: (busy: boolean) => void };
export function History({ children }: { children: (props: SessionProps) => ReactNode }) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<SavedConversation>();
  const [sessionKey, setSessionKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const refresh = useCallback(() => {
    void loadHistory().then((result) => { setItems(result.conversations); setCursor(result.nextCursor); setFailed(false); }).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    let active = true;
    const id = new URL(window.location.href).searchParams.get("conversation");
    void (async () => {
      try {
        if (id) {
          if (!z.uuid().safeParse(id).success) throw new Error("Invalid saved chat");
          const saved = await loadChat(id);
          if (active) setSelected(saved);
        }
      } catch { if (active) { setFailed(true); setOpenFailed(true); } }
      finally { if (active) setLoading(false); }
    })();
    refresh();
    return () => { active = false; };
  }, [refresh]);
  const open = async (item: ConversationSummary) => {
    setLoading(true);
    try {
      const result = await loadChat(item.id);
      setSelected(result); setOpenFailed(false); setSessionKey((key) => key + 1); selectChatUrl(item.id); setVisible(false);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  };
  const discard = async (item: ConversationSummary) => {
    if (!window.confirm(`Delete “${item.title}” and its messages?`)) return;
    setBusy(true);
    try {
      await removeChat(item.id, item.version);
      if (new URL(window.location.href).searchParams.get("conversation") === item.id) {
        setSelected(undefined); setOpenFailed(false); setSessionKey((key) => key + 1); selectChatUrl();
      }
      refresh();
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  return <main className="workspace">
    <div className="history-toolbar">
      <button type="button" className="quiet-button" aria-expanded={visible} aria-controls="saved-history" onClick={() => setVisible((value) => !value)}>History</button>
      <button type="button" className="quiet-button" disabled={busy || loading} onClick={() => { setSelected(undefined); setOpenFailed(false); setSessionKey((key) => key + 1); selectChatUrl(); setVisible(false); }}>New chat</button>
      <div className="history-toolbar-actions">
      <Context7Integration />
      <details className="brand-about">
        <summary>About</summary>
        <div className="brand-about-panel">
          <strong>{brand.appName}</strong>
          <p>Created by {brand.authorName}</p>
          <div className="brand-links">
            {brand.appWebsite && <a href={brand.appWebsite} target="_blank" rel="noopener noreferrer">Application website</a>}
            {brand.appGithubUrl && <a href={brand.appGithubUrl} target="_blank" rel="noopener noreferrer">Project on GitHub</a>}
            {brand.authorWebsite && <a href={brand.authorWebsite} target="_blank" rel="noopener noreferrer">Author website</a>}
            {brand.authorGithub && <a href={brand.authorGithub} target="_blank" rel="noopener noreferrer">Author GitHub</a>}
            {brand.authorWaysToSupportUrl && <a href={brand.authorWaysToSupportUrl} target="_blank" rel="noopener noreferrer">Ways to support</a>}
            {brand.authorBuyMeACoffeeUrl && <a href={brand.authorBuyMeACoffeeUrl} target="_blank" rel="noopener noreferrer">Buy Me a Coffee</a>}
          </div>
          <p className="brand-copyright">© 2026 {brand.authorName} · {brand.license}</p>
        </div>
      </details>
      </div>
    </div>
    <aside id="saved-history" className={`history-panel ${visible ? "history-visible" : ""}`} aria-label="Saved chats">
      <h2>Saved chats</h2>
      {failed && <div role="alert"><p>History could not be loaded or changed.</p><button type="button" className="quiet-button" onClick={refresh}>Retry history</button></div>}
      {!items.length && <p className="message-state">Your conversations will appear here.</p>}
      <ul>{items.map((item) => <li key={item.id}>
        <button type="button" className="history-open" disabled={busy || loading} aria-current={selected?.id === item.id ? "page" : undefined} onClick={() => { void open(item); }}>{item.title}</button>
        <button type="button" className="quiet-button" aria-label={`Delete ${item.title}`} disabled={busy || loading} onClick={() => { void discard(item); }}>×</button>
      </li>)}</ul>
      {cursor && <button type="button" className="quiet-button" disabled={busy || loading} onClick={() => {
        void loadHistory(cursor).then((result) => { setItems((previous) => [...previous, ...result.conversations.filter((item) => !previous.some((old) => old.id === item.id))]); setCursor(result.nextCursor); }).catch(() => setFailed(true));
      }}>Older chats</button>}
    </aside>
    <section className="chat-shell" key={sessionKey}>{loading ? <p role="status">Loading saved chat…</p> : openFailed ? <div className="chat-error" role="alert"><p>This saved chat could not be opened. Retry or start a new chat.</p><button type="button" className="quiet-button" onClick={() => window.location.reload()}>Retry opening chat</button></div> : children({ initial: selected, onSaved: refresh, onBusy: setBusy })}</section>
  </main>;
}
