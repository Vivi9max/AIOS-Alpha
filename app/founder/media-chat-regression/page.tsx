"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aios-founder-access-key";

type MediaRegressionResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  message?: string;
  error?: string;
  executionPolicy?: unknown;
  route?: {
    provider?: string;
    model?: string;
    resolution?: string;
    aspectRatio?: string;
    durationSeconds?: number;
  };
  execution?: {
    attempted?: boolean;
    provider?: string;
    model?: string;
    operationName?: string | null;
    status?: string | null;
    progress?: number | null;
    videoUri?: string | null;
  };
  providerJob?: unknown;
  providerError?: string | null;
  operationName?: string | null;
  providerJobId?: string | null;
  status?: string | null;
  progress?: number | null;
  videoUri?: string | null;
  environment?: {
    geminiConfigured?: boolean;
    googleConfigured?: boolean;
    openAIConfigured?: boolean;
  };
  nextVerification?: unknown;
  latencyMs?: number;
  timestamp?: number;
};

function safeJson(value: unknown): string {
  if (value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return safeJson(value);
}

async function readJsonResponse(
  response: Response,
): Promise<MediaRegressionResponse> {
  const text = await response.text();

  if (!text.trim()) {
    return {
      success: false,
      verified: false,
      code: `HTTP_${response.status}`,
      message: `Server returned an empty response (HTTP ${response.status}).`,
    };
  }

  try {
    return JSON.parse(text) as MediaRegressionResponse;
  } catch {
    return {
      success: false,
      verified: false,
      code: "MEDIA_REGRESSION_NON_JSON_RESPONSE",
      message: `Server returned a non-JSON response (HTTP ${response.status}).`,
      error: text.slice(0, 2000),
    };
  }
}

export default function FounderMediaChatRegressionPage() {
  const [result, setResult] =
    useState<MediaRegressionResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [operationName, setOperationName] = useState("");
  const [accessReady, setAccessReady] = useState(false);

  useEffect(() => {
    try {
      const key =
        window.sessionStorage
          .getItem(STORAGE_KEY)
          ?.trim() ?? "";

      setAccessReady(Boolean(key));
    } catch {
      setAccessReady(false);
    }
  }, []);

  async function runVerification() {
    let key = "";

    try {
      key =
        window.sessionStorage
          .getItem(STORAGE_KEY)
          ?.trim() ?? "";
    } catch {
      key = "";
    }

    if (!key) {
      setError(
        "未检测到 Founder Console 会话。请先返回 /founder 完成 Founder 登录。",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setOperationName("");

    try {
      const response = await fetch(
        "/api/founder/media/chat-regression",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${key}`,
          },
        },
      );

      const data = await readJsonResponse(response);

      setResult(data);

      const returnedOperation =
        data.operationName ??
        data.execution?.operationName ??
        data.providerJobId ??
        "";

      if (returnedOperation) {
        setOperationName(returnedOperation);
      }

      if (!response.ok || data.success !== true) {
        setError(
          data.message ||
            data.providerError ||
            data.error ||
            `Media execution failed (HTTP ${response.status}).`,
        );
        return;
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Media execution request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshExistingJob() {
    let key = "";

    try {
      key =
        window.sessionStorage
          .getItem(STORAGE_KEY)
          ?.trim() ?? "";
    } catch {
      key = "";
    }

    const operation = operationName.trim();

    if (!key) {
      setError(
        "未检测到 Founder Console 会话。请先返回 /founder 完成 Founder 登录。",
      );
      return;
    }

    if (!operation) {
      setError("当前没有可查询的 Veo operation。");
      return;
    }

    setPolling(true);
    setError("");

    try {
      const url =
        `/api/founder/media/chat-regression?operationName=${encodeURIComponent(
          operation,
        )}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${key}`,
        },
      });

      const data = await readJsonResponse(response);

      setResult(data);

      const returnedOperation =
        data.operationName ??
        data.execution?.operationName ??
        operation;

      setOperationName(returnedOperation);

      if (!response.ok || data.success !== true) {
        setError(
          data.message ||
            data.providerError ||
            data.error ||
            `Media status request failed (HTTP ${response.status}).`,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Media status request failed.",
      );
    } finally {
      setPolling(false);
    }
  }

  const status =
    result?.status ??
    result?.execution?.status ??
    "NOT_STARTED";

  const completed = status === "completed";

  const active =
    status === "queued" ||
    status === "in_progress";

  const providerJobId =
    result?.providerJobId ??
    result?.execution?.operationName ??
    null;

  const resolvedOperation =
    operationName ||
    result?.operationName ||
    providerJobId ||
    "";

  const progress =
    result?.progress ??
    result?.execution?.progress ??
    null;

  const videoUri =
    result?.videoUri ??
    result?.execution?.videoUri ??
    null;

  const passed =
    result?.success === true &&
    result?.verified === true &&
    Boolean(providerJobId || resolvedOperation);

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
            Real Media Execution
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            C146.18.3 Founder Live Verification
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
            Chat Prompt → Runtime → Google Veo
          </div>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            使用当前 Founder Console Session
            自动完成认证。不需要再次输入 Access Key，
            也不会在页面中显示密钥。
          </p>

          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: "#fff7ed",
              color: "#9a3412",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            ⚠️ 这是一次真实媒体生成验证。
            如果 Gemini / Veo 已配置，点击执行会创建真实
            Veo Long Running Operation，可能产生 API 用量。
          </div>

          <button
            type="button"
            onClick={() => void runVerification()}
            disabled={loading || !accessReady}
            style={{
              width: "100%",
              minHeight: 54,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background:
                loading || !accessReady
                  ? "#94a3b8"
                  : "#0f172a",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 900,
              cursor:
                loading || !accessReady
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "正在创建真实 Veo Operation…"
              : "▶ Run C146.18.3 Real Verification"}
          </button>

          {!accessReady && (
            <div
              style={{
                marginTop: 12,
                color: "#b91c1c",
                fontSize: 13,
              }}
            >
              未检测到 Founder Session，请先返回
              Founder Console 登录。
            </div>
          )}

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
              <div
                style={{
                  fontWeight: 900,
                  marginBottom: 5,
                }}
              >
                Verification Error
              </div>

              <div>{error}</div>
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
                ? "✓ REAL MEDIA EXECUTION VERIFIED"
                : "✕ REAL MEDIA EXECUTION NOT VERIFIED"}
            </div>

            <div
              style={{
                marginTop: 7,
                color: "#64748b",
                fontSize: 13,
                overflowWrap: "anywhere",
              }}
            >
              {result.code ?? "UNKNOWN"}
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
                display: "grid",
                gap: 10,
                marginTop: 18,
              }}
            >
              <ResultRow
                label="Verification"
                value={
                  result.verified === true
                    ? "VERIFIED"
                    : "NOT VERIFIED"
                }
              />

              <ResultRow
                label="Gemini"
                value={
                  result.environment
                    ?.geminiConfigured === true
                    ? "CONFIGURED"
                    : "NOT CONFIGURED"
                }
              />

              <ResultRow
                label="Provider"
                value={
                  result.route?.provider ??
                  result.execution?.provider ??
                  "unknown"
                }
              />

              <ResultRow
                label="Model"
                value={
                  result.route?.model ??
                  result.execution?.model ??
                  "unknown"
                }
              />

              <ResultRow
                label="Resolution"
                value={
                  result.route?.resolution ??
                  "1080p"
                }
              />

              <ResultRow
                label="Aspect Ratio"
                value={
                  result.route?.aspectRatio ??
                  "9:16"
                }
              />

              <ResultRow
                label="Duration"
                value={
                  typeof result.route
                    ?.durationSeconds === "number"
                    ? `${result.route.durationSeconds}s`
                    : "8s"
                }
              />

              <ResultRow
                label="Status"
                value={displayValue(status)}
              />

              <ResultRow
                label="Progress"
                value={
                  progress !== null &&
                  progress !== undefined
                    ? `${progress}%`
                    : "unknown"
                }
              />

              <ResultRow
                label="Provider Job"
                value={displayValue(providerJobId)}
              />

              <ResultRow
                label="Operation"
                value={displayValue(resolvedOperation)}
              />

              {result.latencyMs !== undefined && (
                <ResultRow
                  label="Latency"
                  value={`${result.latencyMs} ms`}
                />
              )}
            </div>

            {resolvedOperation && (
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
                  }}
                >
                  EXISTING OPERATION
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    lineHeight: 1.55,
                    wordBreak: "break-all",
                  }}
                >
                  {resolvedOperation}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void refreshExistingJob()
                  }
                  disabled={polling}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    marginTop: 12,
                    border: "1px solid #cbd5e1",
                    borderRadius: 13,
                    background: "#ffffff",
                    color: "#0f172a",
                    fontWeight: 900,
                  }}
                >
                  {polling
                    ? "正在读取现有 Operation…"
                    : "↻ Refresh Existing Operation"}
                </button>
              </div>
            )}

            {active && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 14,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Veo Operation 已创建，目前仍在处理中。
                Refresh 只读取现有 Operation，不会创建新的生成任务。
              </div>
            )}

            {completed && videoUri && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 14,
                  background: "#f0fdf4",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    color: "#166534",
                  }}
                >
                  ✓ Video Generation Completed
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    lineHeight: 1.55,
                    wordBreak: "break-all",
                  }}
                >
                  {videoUri}
                </div>
              </div>
            )}

            {result.providerError && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 14,
                  background: "#fff1f2",
                  color: "#9f1239",
                  fontSize: 13,
                  lineHeight: 1.6,
                  overflowWrap: "anywhere",
                }}
              >
                <strong>Provider Error:</strong>{" "}
                {result.providerError}
              </div>
            )}

            {result.executionPolicy !== undefined &&
              result.executionPolicy !== null && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 14,
                    background: "#f8fafc",
                    color: "#475569",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      marginBottom: 8,
                    }}
                  >
                    Execution Policy
                  </div>

                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {safeJson(result.executionPolicy)}
                  </pre>
                </div>
              )}

            {result.nextVerification !== undefined &&
              result.nextVerification !== null && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: 14,
                    background: "#f8fafc",
                    color: "#475569",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      marginBottom: 8,
                    }}
                  >
                    Next Verification
                  </div>

                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {safeJson(result.nextVerification)}
                  </pre>
                </div>
              )}

            <details style={{ marginTop: 18 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#475569",
                }}
              >
                查看完整 Verification JSON
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
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
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
              color: "#475569",
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
          flexShrink: 0,
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
          whiteSpace: "pre-wrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
