// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

export default function Home() {
  return (
    <main>
      <div className="wordmark"><span aria-hidden="true">◈</span> OpenNook AI</div>
      <section aria-labelledby="welcome-title">
        <p className="eyebrow">Your own little corner for AI</p>
        <h1 id="welcome-title">A space to think.<br />A conversation away.</h1>
        <p className="description">
          OpenNook AI is taking shape. Chat, model selection and saved
          conversations are coming next.
        </p>
        <p className="status"><span aria-hidden="true" /> Local foundation ready</p>
      </section>
      <footer>Self-hosted. Built for your own space.</footer>
    </main>
  );
}
