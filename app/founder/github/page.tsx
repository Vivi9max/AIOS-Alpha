"use client";

import { useState } from "react";

type StatusKey = "connection" | "auth" | "repo" | "read" | "write" | "commit";
type StatusMap = Record<StatusKey, string>;

const INITIAL_STATUS: StatusMap = {
  connection: "IDLE",
  auth: "IDLE",
  repo: "IDLE",
  read: "IDLE",
  write: "IDLE",
  commit: "IDLE",
};

const STATUS_ITEMS: { key: StatusKey; label: string }[] = [
  { key: "connection", label: "C141 Verification Connection" },
  { key: "auth", label: "GitHub Authentication" },
  { key: "repo", label: "Repository Access" },
  { key: "read", label: "READ" },
  { key: "write", label: "WRITE" },
  { key: "commit", label: "COMMIT" },
];

const STATUS_COLOR: Record<string, string> = {
  READY: "#16a34a",
  ERROR: "#dc2626",
  RUNNING: "#ea580c",
  IDLE: "#9ca3af",
};

export default function C141GithubLiveVerification() {
  const [accessKey, setAccessKey] = useState("");
  const [status, setStatus] = useState<StatusMap>(INITIAL_STATUS);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const handleRun = async () => {
    if (!accessKey.trim()) {
      setError("请输入 Founder Access Key");
      return;
    }

    setRunning(true);
    setError("");
    setStatus({ ...INITIAL_STATUS, connection: "RUNNING" });

    try {
      const res = await fetch("/api/c141/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "验证失败");
      }

      setStatus({
        connection: "READY",
        auth: "READY",
        repo: "READY",
        read: "READY",
        write: "READY",
        commit: "READY",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证失败");
      setStatus((prev) => ({ ...prev, connection: "ERROR" }));
    } finally {
      setRunning(false);
    }
  };

  const getStatusColor = (value: string) => STATUS_COLOR[value] || STATUS_COLOR.IDLE;

  return (
    <main style={{ minHeight: "100vh", background: "#fafafa", padding: "24px 16px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 4, padding: "2px 8px" }}>
            FOUNDER ONLY
          </span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "#111" }}>
          C141 LIVE VERIFICATION
        </h1>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 24px", lineHeight: 1.5 }}>
          GitHub Direct Bridge 真实验证：AIOS Alpha Production → GitHub Authentication → READ → WRITE → COMMIT
        </p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#333" }}>
          Founder Access Key
        </label>
        <input
          type="password"
          placeholder="Enter your Founder Access Key"
          value={accessKey}
          onChange={(e) => setAccessKey(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={handleRun}
          disabled={running}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "12px 16px",
            background: running ? "#6b7280" : "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Running C141 Live Test..." : "Run C141 Live Test"}
        </button>

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        <div style={{ marginTop: 28, borderTop: "1px solid #e5e5e5", paddingTop: 16 }}>
          {STATUS_ITEMS.map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                fontSize: 13,
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <span style={{ color: "#333" }}>{item.label}</span>
              <span style={{ fontWeight: 700, color: getStatusColor(status[item.key]) }}>
                {status[item.key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
