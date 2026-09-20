"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aios-founder-access-key";

type HealthResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  billable?: boolean;
  environment?: Record<string, unknown>;
  checks?: Record<string, unknown>;
  availability?: unknown;
  automaticRoute?: unknown;
  directRoutes?: unknown;
  timestamp?: number;
  latencyMs?: number;
  error?: string;
  [key: string]: unknown;
};

function readStoredKey(): string {
  try {
    return (
      window.sessionStorage
        .getItem(STORAGE_KEY)
        ?.trim() ?? ""
    );
  } catch {
    return "";
  }
}

async function readJson(
  response: Response,
): Promise<HealthResponse> {
  const body = await response.text();

  if (!body.trim()) {
    return {
      success: false,
      verified: false,
      code: `HTTP_${response.status}`,
      message:
        `Server returned an empty response ` +
        `(HTTP ${response.status}).`,
    };
  }

  try {
    return JSON.parse(body) as HealthResponse;
  } catch {
    return {
      success: false,
      verified: false,
      code: "MEDIA_PROVIDER_HEALTH_NON_JSON",
      message:
        `Server returned a non-JSON response ` +
        `(HTTP ${response.status}).`,
      error: body.slice(0, 2000),
    };
  }
}

async function callHealth(
  method: "GET" | "POST",
  execute = false,
): Promise<HealthResponse> {
  const key = readStoredKey();

  if (!key) {
    return {
      success: false,
      verified: false,
      code: "FOUNDER_SESSION_MISSING",
      message:
        "未检测到 Founder Console Session。请先返回 /founder 登录。",
    };
  }

  const response = await fetch(
    "/api/founder/media/provider-health",
    {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
        ...(method === "POST"
          ? {
              "Content-Type": "application/json",
            }
          : {}),
      },
      ...(method === "POST"
        ? {
            body: JSON.stringify({
              execute,
              kind: "video",
              prompt:
                "A short cinematic AIOS technology scene showing an autonomous operating system coordinating intelligence, planning, execution, and media generation. Clean futuristic environment, professional product demonstration.",
              resolution: "1080p",
              aspectRatio: "9:16",
              durationSeconds: 8,
            }),
          }
        : {}),
    },
  );

  return readJson(response);
}

export default function FounderMediaProviderHealthPage() {
  const [result, setResult] =
    useState<HealthResponse | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [executeLoading, setExecuteLoading] =
    useState(false);

  const [sessionReady, setSessionReady] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setSessionReady(Boolean(readStoredKey()));
  }, []);

  async function runHealth() {
    setLoading(true);
    setError("");

    try {
      const data = await callHealth("GET");

      setResult(data);

      if (
        data.code ===
        "FOUNDER_SESSION_MISSING"
      ) {
        setSessionReady(false);
        setError(
          data.message ??
            "Founder Session missing.",
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Provider health request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runDryRun() {
    setLoading(true);
    setError("");

    try {
      const data = await callHealth(
        "POST",
        false,
      );

      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Provider dry-run failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runRealRegression() {
    setExecuteLoading(true);
    setError("");

    try {
      const data = await callHealth(
        "POST",
        true,
      );

      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Provider live regression failed.",
      );
    } finally {
      setExecuteLoading(false);
    }
  }

  const passed =
    result?.verified === true ||
    result?.code ===
      "C146_18_5_DRY_RUN_PASS";

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
          maxWidth: 900,
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
            Media Provider Health
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            C146.18.5.1 Founder Session Bridge
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
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            Founder Console Session →
            Media Provider Runtime
          </div>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            本页面复用现有 Founder Console
            的 sessionStorage 会话。
            不显示、不重新输入 Access Key；
            API 端仍然保留
            <code>
              isFounderRequest()
            </code>
            安全校验。
          </p>

          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: sessionReady
                ? "#f0fdf4"
                : "#fff1f2",
              color: sessionReady
                ? "#166534"
                : "#be123c",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {sessionReady
              ? "✓ Founder Session detected"
              : "✕ Founder Session missing — 请先返回 /founder 登录"}
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginTop: 18,
            }}
          >
            <button
              type="button"
              onClick={() =>
                void runHealth()
              }
              disabled={
                loading ||
                executeLoading ||
                !sessionReady
              }
              style={buttonStyle}
            >
              {loading
                ? "正在检查…"
                : "① Run Zero-Billable Provider Health"}
            </button>

            <button
              type="button"
              onClick={() =>
                void runDryRun()
              }
              disabled={
                loading ||
                executeLoading ||
                !sessionReady
              }
              style={
                secondaryButtonStyle
              }
            >
              {loading
                ? "正在执行…"
                : "② Run C146.18.5 Dry Run"}
            </button>

            <button
              type="button"
              onClick={() =>
                void runRealRegression()
              }
              disabled={
                loading ||
                executeLoading ||
                !sessionReady
              }
              style={dangerButtonStyle}
            >
              {executeLoading
                ? "正在执行真实 Provider Regression…"
                : "③ Run REAL Provider Failover Regression"}
            </button>
          </div>

          <p
            style={{
              margin: "13px 0 0",
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            ⚠️ 第③项可能产生真实 Google
            Veo / OpenAI API 用量。
            自动路由允许 Google →
            OpenAI → Composer；
            显式 Provider 请求仍禁止静默替换。
          </p>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background: "#fff1f2",
                color: "#be123c",
                fontSize: 13,
                lineHeight: 1.6,
                overflowWrap: "anywhere",
              }}
            >
              <strong>
                Session / Runtime Error
              </strong>

              <div
                style={{
                  marginTop: 5,
                }}
              >
                {error}
              </div>
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
                ? "✓ PROVIDER HEALTH / REGRESSION RESULT"
                : "✕ PROVIDER HEALTH / REGRESSION FAILED"}
            </div>

            <div
              style={{
                marginTop: 7,
                color: "#64748b",
                fontSize: 13,
                overflowWrap: "anywhere",
              }}
            >
              {String(
                result.code ??
                  "UNKNOWN",
              )}
            </div>

            {result.message && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 12,
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {result.message}
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 10,
              }}
            >
              <ResultRow
                label="Verified"
                value={String(
                  result.verified ??
                    false,
                )}
              />

              <ResultRow
                label="Billable"
                value={String(
                  result.billable ??
                    false,
                )}
              />

              <ResultRow
                label="Latency"
                value={
                  typeof result.latencyMs ===
                  "number"
                    ? `${result.latencyMs} ms`
                    : "—"
                }
              />
            </div>

            <pre
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 14,
                background: "#0f172a",
                color: "#e2e8f0",
                fontSize: 11,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                overflowX: "auto",
              }}
            >
              {JSON.stringify(
                result,
                null,
                2,
              )}
            </pre>
          </section>
        )}

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
          }}
        >
          <a
            href="/founder"
            style={{
              color: "#2563eb",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            ← Back to Founder Console
          </a>
        </div>
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
        gap: 12,
        padding: "11px 12px",
        borderRadius: 12,
        background: "#f8fafc",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "#0f172a",
          fontSize: 12,
          fontWeight: 900,
          overflowWrap: "anywhere",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const buttonStyle = {
  width: "100%",
  minHeight: 52,
  border: 0,
  borderRadius: 15,
  background: "#0f172a",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  width: "100%",
  minHeight: 52,
  border: "1px solid #cbd5e1",
  borderRadius: 15,
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
} as const;

const dangerButtonStyle = {
  width: "100%",
  minHeight: 52,
  border: 0,
  borderRadius: 15,
  background: "#7f1d1d",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
} as const;
