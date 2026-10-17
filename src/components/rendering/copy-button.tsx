// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [feedback, setFeedback] = useState("");
  return <span className="copy-control">
    <button type="button" className="quiet-button" aria-label={label} onClick={async () => {
      try {
        await navigator.clipboard.writeText(text);
        setFeedback("Copied");
      } catch { setFeedback("Copy unavailable. Select the text to copy."); }
    }}>{label}</button>
    <span role="status" className="copy-feedback">{feedback}</span>
  </span>;
}
