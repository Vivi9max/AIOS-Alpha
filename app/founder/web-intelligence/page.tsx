"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aios-founder-access-key";

type RegressionResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  error?: string;
  runtime?: string;
  runtimeVersion?: string;
  timestamp?: number;
  latencyMs?: number;
  regression?: {
    intentDetected?: boolean;
    evidenceSuccess?: boolean;
    evidenceVerified?: boolean;
    sourceCount?: number;
    sourceHosts?: string[];
    independentDomainCount?: number;
    independentDomains?: string[];
  };
};

export default function FounderWebIntelligencePage() {
  const [accessKey, setAccessKey] = useState("");
  const [result, setResult] =
    useState<RegressionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(STORAGE_KEY) ?? "";

    setAccessKey(storedKey);
  }, []);

  async function runRegression() {
    const key = accessKey.trim();

    if (!key) {
      setError(
        "未检测到 Founder Access Key。请先返回 Founder Console 登录。",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/founder/web-intelligence/regression",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${key}`,
          },
        },
      );

      const data =
        (await response.json()) as RegressionResponse;

      setResult(data);

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            data.error ||
            `Regression failed (HTTP ${response.status}).`,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Web Intelligence regression request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const passed =
    result?.success === true &&
    result?.verified === true &&
    result?.code ===
      "C143_6_WEB_INTELLIGENCE_REGRESSION_PASS";

  const regression = result?.regression;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 18px 60px",
        boxSizing: "border-box",
        background: "#f4f6fb",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 860,
          margin: "0 auto",
        }}
      >
        <header>
          <div
            style={{
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: "0.14em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 30,
              lineHeight: 1.15,
            }}
          >
            Web Intelligence
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            C143.6 生产回归验证
          </p>
        </header>

        <section
          style={{
            marginTop: 22,
            padding: 20,
            border: "1px solid #dbe3f0",
            borderRadius: 22,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 17,
            }}
          >
            Brave Search → Evidence → Verification
          </div>

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            页面自动使用当前 Founder Console 会话中的 Access
            Key。不会要求再次输入，也不会在页面中显示密钥。
          </p>

          <button
            type="button"
            onClick={() => void runRegression()}
            disabled={loading}
            style={{
              width: "100%",
              minHeight: 52,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background: loading
                ? "#94a3b8"
                : "#0f172a",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 900,
              cursor: loading
                ? "wait"
                : "pointer",
            }}
          >
            {loading
              ? "正在执行 Web Intelligence 回归验证…"
              : "▶ Run C143.6 Regression"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background: "#fff1f2",
                color: "#be123c",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}
        </section>

        {result && (
          <section
            style={{
              marginTop: 18,
              padding: 20,
              border: passed
                ? "1px solid #86efac"
                : "1px solid #fecaca",
              borderRadius: 22,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                fontSize: 21,
                fontWeight: 950,
                color: passed
                  ? "#166534"
                  : "#b91c1c",
              }}
            >
              {passed
                ? "✓ C143.6 WEB INTELLIGENCE REGRESSION PASS"
                : "✕ C143.6 WEB INTELLIGENCE REGRESSION FAILED"}
            </div>

            <div
              style={{
                marginTop: 7,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              {result.code ?? "UNKNOWN"}
              {typeof result.latencyMs === "number"
                ? ` · ${result.latencyMs} ms`
                : ""}
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 18,
              }}
            >
              <ResultRow
                label="Intent Detection"
                value={
                  regression?.intentDetected === true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Brave Evidence"
                value={
                  regression?.evidenceSuccess === true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Multi-source Verification"
                value={
                  regression?.evidenceVerified === true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Evidence Sources"
                value={String(
                  regression?.sourceCount ?? 0,
                )}
              />

              <ResultRow
                label="Independent Domains"
                value={String(
                  regression?.independentDomainCount ?? 0,
                )}
              />

              <ResultRow
                label="Verification"
                value={
                  result.verified === true
                    ? "VERIFIED"
                    : "NOT VERIFIED"
                }
              />

              <ResultRow
                label="Runtime"
                value={
                  result.runtime ??
                  "aios-alpha"
                }
              />

              <ResultRow
                label="Runtime Version"
                value={
                  result.runtimeVersion ??
                  "unknown"
                }
              />
            </div>

            {(
              regression?.sourceHosts?.length ??
              0
            ) > 0 && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 14,
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#64748b",
                    marginBottom: 8,
                  }}
                >
                  SOURCE HOSTS
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 7,
                  }}
                >
                  {regression?.sourceHosts?.map(
                    (host) => (
                      <span
                        key={host}
                        style={{
                          padding:
                            "5px 9px",
                          borderRadius: 999,
                          background:
                            "#e2e8f0",
                          color:
                            "#334155",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {host}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}

            <details
              style={{
                marginTop: 18,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#475569",
                }}
              >
                查看完整 Regression JSON
              </summary>

              <pre
                style={{
                  marginTop: 12,
                  padding: 14,
                  overflowX: "auto",
                  borderRadius: 14,
                  background: "#0f172a",
                  color: "#e2e8f0",
                  fontSize: 12,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {JSON.stringify(
                  result,
                  null,
                  2,
                )}
              </pre>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 14px",
        borderRadius: 13,
        background: "#f8fafc",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "#0f172a",
          fontSize: 13,
          fontWeight: 900,
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
