"use client";

import { useState } from "react";

export default function Chat() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!prompt.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const data = await res.json();

      setAnswer(data.content);
    } catch {
      setAnswer("Request Failed");
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h2>AIOS Alpha</h2>

      <textarea
        rows={8}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
        }}
      />

      <br />

      <button
        onClick={send}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "10px 24px",
        }}
      >
        {loading ? "Thinking..." : "Send"}
      </button>

      <div
        style={{
          marginTop: 30,
          whiteSpace: "pre-wrap",
          border: "1px solid #ddd",
          padding: 20,
          borderRadius: 8,
        }}
      >
        {answer}
      </div>
    </div>
  );
}