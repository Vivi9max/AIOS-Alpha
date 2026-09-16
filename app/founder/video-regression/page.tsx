"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

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

  checks?: {
    auth?: boolean;
    sourceUrlValid?: boolean;
    mediaTypeDetection?: boolean;
    resolverExecuted?: boolean;
    resolverReturned?: boolean;
    safeUrlValidation?: boolean;
    finalRegressionPass?: boolean;
  };

  sourceUrl?: string;
  mediaType?: string;
  candidateCount?: number;
  selectedUrl?: string;
  candidates?: unknown[];
};

export default function FounderVideoRegressionPage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [result, setResult] =
    useState<RegressionResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const storedKey =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      ) ?? "";

    setAccessKey(storedKey);
  }, []);

  async function runRegression() {
    const key =
      accessKey.trim();

    if (!key) {
      setError(
        "未检测到 Founder Console 会话。请先进入 /founder 完成 Founder 登录。",
      );

      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/video/regression",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${key}`,
            },
          },
        );

      const data =
        (await response.json()) as RegressionResponse;

      setResult(data);

      if (
        !response.ok ||
        data.success !== true
      ) {
        setError(
          data.message ||
            data.error ||
            `Regression failed (HTTP ${response.status}).`,
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Video Resolver regression request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const checks =
    result?.checks;

  const passed =
    result?.success === true &&
    result?.verified === true &&
    checks?.auth === true &&
    checks?.sourceUrlValid === true &&
    checks?.mediaTypeDetection === true &&
    checks?.resolverExecuted === true &&
    checks?.resolverReturned === true &&
    checks?.safeUrlValidation === true &&
    checks?.finalRegressionPass === true &&
    result?.code ===
      "C144_4_8_VIDEO_RESOLVER_REGRESSION_PASS";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding:
          "24px 18px 60px",
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
              letterSpacing:
                "0.14em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              margin:
                "8px 0 0",
              fontSize: 30,
              lineHeight: 1.15,
            }}
          >
            Video Resolver
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            C144.4.8 Runtime Regression
          </p>
        </header>

        <section
          style={{
            marginTop: 22,
            padding: 20,
            border:
              "1px solid #dbe3f0",
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
            Source Page
            {" → "}
            Video Candidate
            {" → "}
            Media Type
            {" → "}
            Safe Resolver
          </div>

          <p
            style={{
              margin:
                "8px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            当前页面自动使用 Founder
            Console 会话中的 Access Key。
            不显示、不要求再次输入密钥。
          </p>

          <button
            type="button"
            onClick={() =>
              void runRegression()
            }
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
              ? "正在执行 Video Resolver 回归验证…"
              : "▶ Run C144.4.8 Regression"}
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
                ? "✓ C144.4.8 VIDEO RESOLVER REGRESSION PASS"
                : "✕ C144.4.8 VIDEO RESOLVER REGRESSION FAILED"}
            </div>

            <div
              style={{
                marginTop: 7,
                color: "#64748b",
                fontSize: 13,
              }}
            >
              {result.code ??
                "UNKNOWN"}
              {typeof result.latencyMs ===
                "number"
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
                label="Founder Auth"
                value={
                  checks?.auth === true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Source URL"
                value={
                  checks?.sourceUrlValid ===
                  true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Media Type Detection"
                value={
                  checks?.mediaTypeDetection ===
                  true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Resolver Execution"
                value={
                  checks?.resolverExecuted ===
                  true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Resolver Result"
                value={
                  checks?.resolverReturned ===
                  true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Safe URL Validation"
                value={
                  checks?.safeUrlValidation ===
                  true
                    ? "PASSED"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Final Regression"
                value={
                  checks?.finalRegressionPass ===
                  true
                    ? "PASS"
                    : "FAILED"
                }
              />

              <ResultRow
                label="Media Type"
                value={
                  result.mediaType ??
                  "unknown"
                }
              />

              <ResultRow
                label="Candidates"
                value={String(
                  result.candidateCount ??
                    0,
                )}
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

            {result.selectedUrl && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 14,
                  background:
                    "#f8fafc",
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
                  SELECTED MEDIA URL
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#334155",
                    lineHeight: 1.6,
                    wordBreak:
                      "break-all",
                  }}
                >
                  {result.selectedUrl}
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
                  overflowX:
                    "auto",
                  borderRadius: 14,
                  background:
                    "#0f172a",
                  color:
                    "#e2e8f0",
                  fontSize: 12,
                  lineHeight: 1.55,
                  whiteSpace:
                    "pre-wrap",
                  wordBreak:
                    "break-word",
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
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap: 16,
        padding:
          "12px 14px",
        borderRadius: 13,
        background:
          "#f8fafc",
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
          textAlign:
            "right",
          wordBreak:
            "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
