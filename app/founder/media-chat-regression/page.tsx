"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aios-founder-access-key";

export default function MediaChatRegressionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  async function run() {
    setLoading(true);
    const key = window.sessionStorage.getItem(STORAGE_KEY) ?? "";
    const response = await fetch("/api/founder/media/chat-regression", {
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
    });
    setData(await response.json());
    setLoading(false);
  }

  useEffect(() => { void run(); }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>PRIVATE FOUNDER ACCESS</h1>
      <h2>Media Chat → Router</h2>
      <p>C146.18 Live Chat → Media Router Contract Regression</p>
      <button onClick={() => void run()} disabled={loading} style={{ padding: "10px 14px", borderRadius: 8 }}>
        {loading ? "Running…" : "▶ Run C146.18 Regression"}
      </button>
      {data && (
        <section style={{ marginTop: 20 }}>
          <h2>{data.verified ? "✓ C146.18 MEDIA CHAT ROUTER PASS" : "✕ C146.18 REGRESSION FAILED"}</h2>
          <p>{data.code}</p>
          <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto", padding: 16, background: "#f5f5f5", borderRadius: 12 }}>{JSON.stringify(data, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
