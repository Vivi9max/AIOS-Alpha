"use client";

import { useState } from "react";

type ChatRegressionResponse = {
  success?: boolean;
  content?: string;
  error?: string;
  code?: string;
  userId?: string;
  identityMode?: string;
  dataIsolated?: boolean;
  locale?: string;
  runtime?: string;
  runtimeStage?: string;
  runtimeVersion?: string;
  latencyMs?: number;
  webIntelligence?: {
    required?: boolean;
    success?: boolean;
    verified?: boolean;
    sourceCount?: number;
    sourceHosts?: string[];
  };
  execution?: {
    provider?: string;
    capabilityTrace?: string[];
  };
};

const TEST_PROMPT =
  "What is the latest major news about OpenAI today? Verify the current information using reliable external web sources.";

export default function FounderChatWebRegressionPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<ChatRegressionResponse | null>(null);
  const [error, setError] = useState("");

  async function runRegression() {
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-aios-locale": "en",
        },
        body: JSON.stringify({
          prompt: TEST_PROMPT,
        }),
      });

      const data =
        (await response.json()) as ChatRegressionResponse;

      setResult(data);

      if (!response.ok || data.success !== true) {
        setError(
          data.error ??
            `Chat regression failed (HTTP ${response.status}).`,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Chat regression request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const web = result?.webIntelligence;

  const httpPassed =
    result !== null &&
    result.success === true;

  const webRequired =
    web?.required === true;

  const webSucceeded =
    web?.success === true;

  const webVerified =
    web?.verified === true;

  const minimumSources =
    (web?.sourceCount ?? 0) >= 2;

  const independentHosts =
    new Set(web?.sourceHosts ?? []).size >= 2;

  const runtimeReturned =
    typeof result?.runtime === "string" &&
    result.runtime.length > 0;

  const finalPass =
    httpPassed &&
    webRequired &&
    webSucceeded &&
    webVerified &&
    minimumSources &&
    independentHosts &&
    runtimeReturned;

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
            Chat Web Intelligence
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            C143.7 普通 Chat 生产链路验证
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
            Chat → Web Intelligence → Runtime
          </div>

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            本验证直接调用生产
            <code
              style={{
                margin: "0 4px",
                padding: "2px 5px",
                borderRadius: 5,
                background: "#f1f5f9",
              }}
            >
              /api/chat
            </code>
            ，不调用 C143.6 Founder Web Regression
            接口。
          </p>

          <div
            style={{
              marginTop: 14,
              padding: 13,
              borderRadius: 13,
              background: "#f8fafc",
              color: "#475569",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            Test Prompt
            <br />
            {TEST_PROMPT}
          </div>

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
              ? "正在执行真实 Chat 回归…"
              : "▶ Run C143.7 Chat Regression"}
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
              border: finalPass
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
                color: finalPass
                  ? "#166534"
                  : "#b91c1c",
              }}
            >
              {finalPass
                ? "✓ C143.7 CHAT WEB INTELLIGENCE PASS"
                : "✕ C143.7 CHAT WEB INTELLIGENCE FAILED"}
            </div>

            <div
              style={{
                marginTop: 7,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              {finalPass
                ? "生产 /api/chat 已真实完成 Web Intelligence → Runtime 链路"
                : result.code ?? "CHAT_WEB_INTELLIGENCE_REGRESSION_FAILED"}
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
                label="HTTP / Chat Success"
                value={
                  httpPassed
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Web Intelligence Required"
                value={
                  webRequired
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Web Evidence Retrieved"
                value={
                  webSucceeded
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Multi-source Verification"
                value={
                  webVerified
                    ? "VERIFIED"
                    : "NOT VERIFIED"
                }
              />

              <ResultRow
                label="Minimum Sources"
                value={
                  minimumSources
                    ? `${web?.sourceCount ?? 0} · PASSED`
                    : `${web?.sourceCount ?? 0} · FAILED`
                }
              />

              <ResultRow
                label="Independent Hosts"
                value={
                  independentHosts
                    ? `${new Set(
                        web?.sourceHosts ?? [],
                      ).size} · PASSED`
                    : `${new Set(
                        web?.sourceHosts ?? [],
                      ).size} · FAILED`
                }
              />

              <ResultRow
                label="Runtime"
                value={
                  result.runtime ??
                  "unknown"
                }
              />

              <ResultRow
                label="Runtime Stage"
                value={
                  result.runtimeStage ??
                  "unknown"
                }
              />

              <ResultRow
                label="Runtime Version"
                value={
                  result.runtimeVersion ??
                  "unknown"
                }
              />

              <ResultRow
                label="Identity Mode"
                value={
                  result.identityMode ??
                  "unknown"
                }
              />

              <ResultRow
                label="Data Isolation"
                value={
                  result.dataIsolated === true
                    ? "ISOLATED"
                    : "UNKNOWN"
                }
              />
            </div>

            {(web?.sourceHosts?.length ?? 0) >
              0 && (
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
                  VERIFIED SOURCE HOSTS
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 7,
                  }}
                >
                  {web.sourceHosts.map(
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

            {result.content && (
              <div
                style={{
                  marginTop: 18,
                  padding: 15,
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
                  ACTUAL CHAT RESPONSE
                </div>

                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {result.content}
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
                查看完整 C143.7 Response JSON
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
