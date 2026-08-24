"use client";

import { useState } from "react";

export default function C141GithubLiveVerification() {
  const [accessKey, setAccessKey] = useState("");
  const [status, setStatus] = useState({
    connection: "IDLE",
    auth: "IDLE",
    repo: "IDLE",
    read: "IDLE",
    write: "IDLE",
    commit: "IDLE",
  });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const runTest = async () => {
    if (!accessKey.trim()) {
      setError("请输入 Founder Access Key");
      return;
    }
    setRunning(true);
    setError("");
    setStatus({ connection: "RUNNING", auth: "IDLE", repo: "IDLE", read: "IDLE", write: "IDLE", commit: "IDLE" });

    try {
      const res = await fetch("/api/c141/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "验证失败");
      setStatus(data.status);
    } catch (err: any) {
      setError(err.message || "验证失败");
      setStatus((s) => ({ ...s, connection: "ERROR" }));
    } finally {
      setRunning(false);
    }
  };

  const items = [
    { key: "connection", label: "C141 Verification Connection" },
    { key: "auth", label: "GitHub Authentication" },
    { key: "repo", label: "Repository Access" },
    { key: "read", label: "READ" },
    { key: "write", label: "WRITE" },
    { key: "commit", label: "COMMIT" },
  ];

  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>FOUNDER ONLY · C141 LIVE VERIFICATION</h1>
      <p style={{ fontSize: 13, opacity: 0.7 }}>GitHub Direct Bridge 真实验证：AIOS Alpha Production → GitHub Authentication → READ → WRITE → COMMIT</p>

      <input
        type="password"
        placeholder="Founder Access Key"
        value={accessKey}
        onChange={(e) => setAccessKey(e.target.value)}
        style={{ width: "100%", padding: 12, margin: "16px 0", border: "1px solid #333", borderRadius: 6, fontSize: 14 }}
      />
      <button
        onClick={runTest}
        disabled={running}
        style={{ width: "100%", padding: 12, background: "#000", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}
      >
        {running ? "Running..." : "Run C141 Live Test"}
      </button>

      {error && <p style={{ color: "red", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <div style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 16 }}>
        {items.map((item) => (
          <div key={item.key} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
            <span>{item.label}</span>
            <span style={{ fontWeight: 700, color: status[item.key] === "READY" ? "green" : status[item.key] === "ERROR" ? "red" : status[item.key] === "RUNNING" ? "orange" : "#999" }}>
              {status[item.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
