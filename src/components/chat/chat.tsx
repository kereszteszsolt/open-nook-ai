// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useAISDKRuntime } from "@assistant-ui/ai-sdk";
import { AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { DefaultChatTransport } from "ai";
import { z } from "zod";
import { CopyButton } from "../rendering/copy-button";
import { RichText } from "../rendering/rich-text";
import type { SavedConversation } from "@/shared/conversations";
import { createChat, loadChat, uiMessages, selectChatUrl } from "./history-client";
import { History } from "./history";
import { chatPayload } from "./transport";

const registry = z.object({
  enabled: z.boolean(), status: z.enum(["ready", "missing_api_key", "missing_models", "invalid_configuration"]),
  models: z.array(z.object({ id: z.string().min(1).max(200), label: z.string().min(1).max(200) })).max(5),
});
type Registry = z.infer<typeof registry>;

function Message() {
  const message = useAuiState((state) => state.message);
  const text = message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
  const assistant = message.role === "assistant";
  const streaming = message.status?.type === "running";
  const savedStatus = message.metadata.custom?.savedStatus;
  const incomplete = message.status?.type === "incomplete" || savedStatus === "stopped";
  const failed = savedStatus === "failed";
  const pending = savedStatus === "pending" && !streaming;
  return <MessagePrimitive.Root className={`message ${assistant ? "assistant-message" : "user-message"}`}>
    <div className="message-author">{assistant ? "OpenNook" : "You"}</div>
    {assistant ? <RichText text={text} streaming={streaming} /> : <p className="plain-text">{text}</p>}
    {streaming && <p className="message-state" role="status">Writing…</p>}
    {incomplete && <p className="message-state">Response stopped or incomplete.</p>}
    {failed && <p className="message-state">Response failed. Regenerate to try again.</p>}
    {pending && <p className="message-state">Response is unfinished. Reload saved history to check its status.</p>}
    {!!text && <div className="message-actions"><CopyButton text={text} label="Copy message" /></div>}
  </MessagePrimitive.Root>;
}

function Session({ models, model, selectModel, reloadModels, initial, onSaved, onBusy }: {
  models: Registry; model: string; selectModel: (model: string) => void; reloadModels: () => void;
  initial?: SavedConversation; onSaved: () => void; onBusy: (busy: boolean) => void;
}) {
  const [limitError, setLimitError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(initial);
  const current = useRef(initial);
  const sync = useRef<() => Promise<void>>(async () => {});
  const syncPromise = useRef<Promise<void> | undefined>(undefined);
  // The SDK invokes this callback on send, after render; it never reads the saved version during construction.
  // eslint-disable-next-line react-hooks/refs
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: async ({ messages, trigger, id, messageId }) => {
      let body;
      try { body = chatPayload(model, messages, trigger, id, messageId); setLimitError(false); }
      catch (error) { setLimitError(true); throw error; }
      setSyncing(true);
      setSaveError(false);
      if (!current.current) {
        const created = await createChat();
        current.current = { ...created, messages: [] };
        setSaved(current.current);
        selectChatUrl(created.id);
        onSaved();
      }
      const state = current.current;
      // A failed request before provider access may leave a visible, unsaved prompt.
      const regenerate = trigger === "regenerate-message" && state.messages.some((item) => item.id === body.messages[0].id);
      return { body: { ...body, trigger: regenerate ? "regenerate-message" : "submit-message",
        conversationId: state.id, version: state.version, requestId: crypto.randomUUID() } };
    },
  }), [model, onSaved]);
  const chat = useChat({ throttle: 50, transport, messages: initial ? uiMessages(initial) : [],
    onFinish: () => { void sync.current(); }, onError: () => { void sync.current(); },
  });
  useEffect(() => { sync.current = () => {
    if (syncPromise.current) return syncPromise.current;
    const work = async () => {
      setSyncing(true);
      try {
        if (!current.current) throw new Error("No saved chat");
        let result = await loadChat(current.current.id);
        for (let attempt = 0; result.active && attempt < 40; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          result = await loadChat(result.id);
        }
        if (result.active) throw new Error("Saving has not finished");
        current.current = result;
        setSaved(result);
        const latestUser = chat.messages.findLast((message) => message.role === "user");
        if (!latestUser || result.messages.some((message) => message.id === latestUser.id)) chat.setMessages(uiMessages(result));
        else throw new Error("The visible prompt has not been saved");
        setSaveError(false);
        onSaved();
      } catch { setSaveError(true); }
      finally { setSyncing(false); syncPromise.current = undefined; }
    };
    syncPromise.current = work();
    return syncPromise.current;
  }; }, [chat, onSaved]);
  const runtime = useAISDKRuntime(chat);
  const running = chat.status === "submitted" || chat.status === "streaming";
  const busy = running || syncing;
  useEffect(() => { onBusy(busy); }, [busy, onBusy]);
  const enabled = models.enabled && !!model;
  const hasPrompt = chat.messages.some((message) => message.role === "user");
  const { stop } = chat;
  useEffect(() => { if (initial?.active) void sync.current(); }, [initial]);
  useEffect(() => () => { void stop(); }, [stop]);
  return <AssistantRuntimeProvider runtime={runtime}>
    <header className="chat-header">
      <div className="wordmark"><span aria-hidden="true">◈</span> OpenNook AI <span className="local-badge">Local</span></div>

    </header>
    <div className="model-bar">
      <label htmlFor="chat-model">Model</label>
      <select id="chat-model" value={model} disabled={!enabled || busy} onChange={(event) => selectModel(event.target.value)}>
        {!model && <option value="">No models configured</option>}
        {models.models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <span className="session-note">{syncing || running ? "Saving…" : saveError ? "Not saved" : saved ? "Saved on this device" : "History is saved on this device"}</span>
    </div>
    {!enabled && <div className="setup-message" role="status">
      <h2>Connect a model to begin</h2>
      <p>{models.status === "invalid_configuration" ? "Check the model and request limits in your server settings." : "Add an OpenRouter API key and at least one model in your server settings."}</p>
      <button type="button" className="quiet-button" onClick={reloadModels}>Check configuration again</button>
    </div>}
    <ThreadPrimitive.Root className="thread">
      <ThreadPrimitive.Viewport className="thread-viewport" aria-busy={busy}>
        {!chat.messages.length && <section className="welcome" aria-labelledby="welcome-title">
          <p className="eyebrow">Your own little corner for AI</p>
          <h1 id="welcome-title">A space to think.<br />A conversation away.</h1>
          <p>Ask a question, explore an idea, or work through a problem.</p>
        </section>}
        <div className="messages" aria-label="Conversation">
          <ThreadPrimitive.Messages>{() => <Message />}</ThreadPrimitive.Messages>
        </div>
        {chat.status === "submitted" && <p className="run-status" role="status">Waiting for the model…</p>}
      </ThreadPrimitive.Viewport>
      <div className="composer-area">
        {saveError && <div className="chat-error" role="alert"><p>Saved history could not be synchronized. Your visible messages are still here.</p><button type="button" className="quiet-button" disabled={busy} onClick={() => { void sync.current(); }}>Reload saved history</button></div>}
        {chat.error && <div className="chat-error" role="alert">
          <p>{limitError ? "This conversation exceeds the request limits. Shorten your prompt or start a new chat." : "The model request failed. Your messages are still here. Check your connection and model settings, then try Regenerate."}</p>
          <button type="button" className="quiet-button" onClick={() => chat.clearError()}>Dismiss error</button>
        </div>}
        <div className="thread-actions">
          <ThreadPrimitive.ScrollToBottom className="quiet-button">Latest message ↓</ThreadPrimitive.ScrollToBottom>
          <button type="button" className="quiet-button" disabled={!enabled || busy || !hasPrompt} onClick={() => { chat.clearError(); void chat.regenerate(); }}>Regenerate</button>
        </div>
        <ComposerPrimitive.Root className="composer">
          <label htmlFor="chat-prompt" className="sr-only">Message</label>
          <ComposerPrimitive.Input id="chat-prompt" placeholder="Ask a question…" rows={2} maxLength={8000} addAttachmentOnPaste={false} disabled={!enabled || busy} aria-describedby="composer-help" />
          <div className="composer-controls">
            <span id="composer-help">Enter to send · Shift+Enter for a new line</span>
            {running ? <ComposerPrimitive.Cancel className="primary-button">Stop</ComposerPrimitive.Cancel>
              : <ComposerPrimitive.Send className="primary-button" disabled={!enabled || busy}>Send ↑</ComposerPrimitive.Send>}
          </div>
        </ComposerPrimitive.Root>
        <p className="privacy-note">Chats are stored in your local database. Messages you send go to your selected OpenRouter model. AI can make mistakes.</p>
      </div>
    </ThreadPrimitive.Root>
  </AssistantRuntimeProvider>;
}

export function Chat() {
  const [models, setModels] = useState<Registry>();
  const [failed, setFailed] = useState(false);
  const [model, setModel] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/models", { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      if (!response.ok && response.status !== 503) throw new Error("Model registry unavailable");
      return registry.parse(await response.json());
    }).then((result) => {
      if (controller.signal.aborted) return;
      setModels(result); setFailed(false);
      setModel((current) => {
        let preferred = current;
        try { preferred ||= sessionStorage.getItem("opennook.model") ?? ""; } catch { /* Storage can be unavailable. */ }
        return result.models.some((item) => item.id === preferred) ? preferred : result.models[0]?.id ?? "";
      });
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [refresh]);
  if (failed) return <main className="connection-state"><h1>Models could not be loaded</h1><p>Check that OpenNook is running, then try again.</p><button type="button" className="primary-button" onClick={() => { setFailed(false); setRefresh((value) => value + 1); }}>Try again</button></main>;
  if (!models) return <main className="connection-state"><p role="status">Loading your models…</p></main>;
  return <History>{({ initial, onSaved, onBusy }) => <Session models={models} model={model} selectModel={(value) => {
    setModel(value);
    try { sessionStorage.setItem("opennook.model", value); } catch { /* The in-memory selection still works. */ }
  }} reloadModels={() => setRefresh((value) => value + 1)} initial={initial} onSaved={onSaved} onBusy={onBusy} />}</History>;
}
