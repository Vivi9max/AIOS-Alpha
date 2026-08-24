"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "aios-founder-access-key";

type VerifyResult = {
  success: boolean;
  phase?: string;
  error?: string;
  durationMs?: number;
  checks?: Record<string, string>;
  account?: { login?: string; id?: number; type?: string };
  repository?: {
    fullName?: string;
    private?: boolean;
    defaultBranch?: string;
    permissions?: {
      admin?: boolean;
      push?: boolean;
      pull?: boolean;
    };
  } | string;
  read?: { path?: string; size?: number; sha?: string };
  write?: { path?: string; sha?: string };
  commit?: { sha?: string; url?: string };
};

function CheckRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  const pass = value === "PASS";
  const pending = !value || value === "NOT_RUN";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "13px 0",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <span style={{ fontWeight: 800 }}>{label}</span>
      <span
        style={{
          minWidth: 82,
          textAlign: "center",
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 950,
          background: pass
            ? "#dcfce7"
            : pending
              ? "#f1f5f9"
              : "#fee2e2",
          color: pass
            ? "#166534"
            : pending
              ? "#64748b"
              : "#991b1b",
        }}
      >
        {value || "READY"}
      </span>
    </div>
  );
}

export default function FounderGitHubPage() {
  const [key, setKey] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) setKey(stored);
  }, []);

  async function runTest() {
    const normalized = key.trim();

    if (!normalized) {
      setError("请先输入 Founder Access Key。");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/founder/github-verify", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${normalized}`,
        },
      });

      const data = (await response.json()) as VerifyResult;

      if (!response.ok || !data.success) {
        setResult(data);
        setError(data.error || "GitHub Live Verification failed.");
        return;
      }

      window.sessionStorage.setItem(STORAGE_KEY, normalized);
      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "GitHub Live Verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const checks = result?.checks || {};

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 18px 60px",
        background: "#f4f6fb",
        color: "#0f172a",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Link
          href="/founder"
          style={{
            color: "#2563eb",
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          ← Founder Console
        </Link>

        <header style={{ marginTop: 24 }}>
          <div
            style={{
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: "0.14em",
            }}
          >
            FOUNDER ONLY · C141 LIVE VERIFICATION
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 32 }}>
            GitHub Direct Bridge
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            真实验证 AIOS Alpha Production → GitHub Authentication → READ →
            WRITE → COMMIT。GITHUB_TOKEN 永远只在服务器端使用。
          </p>
        </header>

        <section
          style={{
            marginTop: 22,
            padding: 20,
            border: "1px solid #dbe3f0",
            borderRadius: 22,
            background: "#fff",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            Founder Access Key
          </label>

          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="输入现有 FOUNDER_ACCESS_KEY"
            autoComplete="off"
            style={{
              width: "100%",
              height: 48,
              padding: "0 14px",
              boxSizing: "border-box",
              border: "1px solid #cbd5e1",
              borderRadius: 13,
              fontSize: 15,
            }}
          />

          <button
            type="button"
            onClick={() => void runTest()}
            disabled={loading}
            style={{
              width: "100%",
              height: 50,
              marginTop: 12,
              border: 0,
              borderRadius: 14,
              background: loading ? "#94a3b8" : "#0f172a",
              color: "#fff",
              fontWeight: 950,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "正在执行 C141 Live Test…" : "Run C141 Live Test"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 13,
                borderRadius: 13,
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}
        </section>

        <section
          style={{
            marginTop: 18,
            padding: 20,
            border: "1px solid #dbe3f0",
            borderRadius: 22,
            background: "#fff",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>
            C141 Verification
          </h2>

          <div style={{ marginTop: 12 }}>
            <CheckRow label="Connection" value={checks.connection} />
            <CheckRow
              label="GitHub Authentication"
              value={checks.authentication}
            />
            <CheckRow label="Repository Access" value={checks.repository} />
            <CheckRow label="READ" value={checks.read} />
            <CheckRow label="WRITE" value={checks.write} />
            <CheckRow label="COMMIT" value={checks.commit} />
          </div>

          {result?.success && (
            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 16,
                background: "#ecfdf5",
                color: "#065f46",
                fontWeight: 950,
                lineHeight: 1.6,
              }}
            >
              C141 GitHub Direct Bridge — FULLY OPERATIONAL
            </div>
          )}

          {result?.repository &&
            typeof result.repository !== "string" && (
              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 16,
                  background: "#f8fafc",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                <strong>Repository:</strong>{" "}
                {result.repository.fullName || "unknown"}
                <br />
                <strong>Branch:</strong>{" "}
                {result.repository.defaultBranch || "unknown"}
                <br />
                <strong>Account:</strong>{" "}
                {result.account?.login || "unknown"}
                {result.read?.path && (
                  <>
                    <br />
                    <strong>Read:</strong> {result.read.path}
                  </>
                )}
                {result.write?.path && (
                  <>
                    <br />
                    <strong>Write:</strong> {result.write.path}
                  </>
                )}
                {result.commit?.sha && (
                  <>
                    <br />
                    <strong>Commit:</strong>{" "}
                    {result.commit.sha.slice(0, 12)}…
                  </>
                )}
                {result.durationMs !== undefined && (
                  <>
                    <br />
                    <strong>Duration:</strong> {result.durationMs} ms
                  </>
                )}
              </div>
            )}
        </section>

        <section
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 18,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>Founder-only boundary:</strong> 此页面使用现有
          FOUNDER_ACCESS_KEY。不会把 GITHUB_TOKEN 或 CRON_SECRET 发送到浏览器。
          WRITE 测试会在 GitHub 的
          <code>docs/runtime/c141-live-test.json</code> 创建或更新一个专用测试文件，
          以留下真实 Commit 证据。
        </section>
      </div>
    </main>
  );
}
