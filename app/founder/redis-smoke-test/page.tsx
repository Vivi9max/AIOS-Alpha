"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "aios-founder-access-key";
const API_PATH = "/api/founder/redis-smoke-test";

type CheckKey =
  | "redisPing"
  | "set"
  | "get"
  | "valueMatch"
  | "delete"
  | "verifyDelete";

type SmokeResult = {
  service?: string;
  test?: string;
  success?: boolean;
  status?: "PASS" | "FAIL" | "BLOCKED";
  stage?: string;
  code?: string;
  testId?: string;
  redisMode?: string;
  checks?: Partial<Record<CheckKey, boolean>>;
  summary?: string;
  error?: string;
  timestamp?: string;
};

const steps: {
  key: CheckKey;
  label: string;
  detail: string;
}[] = [
  {
    key: "redisPing",
    label: "PING",
    detail: "Redis connectivity",
  },
  {
    key: "set",
    label: "SET",
    detail: "Write isolated test data",
  },
  {
    key: "get",
    label: "GET",
    detail: "Read test data",
  },
  {
    key: "valueMatch",
    label: "COMPARE",
    detail: "Compare written and returned values",
  },
  {
    key: "delete",
    label: "DEL",
    detail: "Delete the test key",
  },
  {
    key: "verifyDelete",
    label: "VERIFY DELETE",
    detail: "Confirm the key no longer exists",
  },
];

function readFounderKey(): string {
  try {
    return (
      window.sessionStorage.getItem(STORAGE_KEY)?.trim() ?? ""
    );
  } catch {
    return "";
  }
}

function getStatusColor(status?: string) {
  if (status === "PASS") return "#15803d";
  if (status === "FAIL") return "#dc2626";
  if (status === "BLOCKED") return "#d97706";
  return "#64748b";
}

export default function FounderRedisSmokeTestPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SmokeResult | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSessionReady(Boolean(readFounderKey()));
  }, []);

  async function runSmokeTest() {
    const key = readFounderKey();

    if (!key) {
      setSessionReady(false);
      setError("Founder Session missing. Please log in at /founder first.");
      return;
    }

    setRunning(true);
    setResult(null);
    setHttpStatus(null);
    setDuration(null);
    setError("");

    const startedAt = Date.now();

    try {
      const response = await fetch(API_PATH, {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${key}`,
        },
      });

      setHttpStatus(response.status);

      const elapsed = Date.now() - startedAt;
      setDuration(elapsed);

      const bodyText = await response.text();

      let data: SmokeResult;

      try {
        data = JSON.parse(bodyText) as SmokeResult;
      } catch {
        data = {
          success: false,
              status: "FAIL",
          stage: "RESPONSE",
          error: bodyText.slice(0, 1000) || "Empty or invalid JSON response.",
        };
      }

      setResult(data);

      if (!response.ok || !data.success) {
        setError(
          data.error ||
            data.code ||
            `Smoke test failed (HTTP ${response.status}).`,
        );
      }
    } catch (requestError) {
      setDuration(Date.now() - startedAt);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Network request failed.",
      );
    } finally {
      setRunning(false);
    }
  }

  const checks = result?.checks ?? {};
  const overall = result?.status ?? "NOT RUN";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "22px 16px 60px",
        boxSizing: "border-box",
        background: "#f4f6fb",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link
          href="/founder"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          ← Founder Console
        </Link>

        <header
          style={{
            marginTop: 18,
            padding: 22,
            borderRadius: 22,
            background: "#0f172a",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#93c5fd",
              fontWeight: 900,
              letterSpacing: "0.13em",
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1 style={{ margin: "9px 0 0", fontSize: 28 }}>
            Redis Smoke Test
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: 13,
              color: "#cbd5e1",
              lineHeight: 1.65,
            }}
          >
            Production Redis real read/write/delete verification.
            No CI simulation. No mock data.
          </p>
        </header>

        <section
          style={{
            marginTop: 16,
            padding: 18,
            border: "1px solid #dbe3f0",
            borderRadius: 20,
            background: "#ffffff",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17 }}>
            Founder Session
          </h2>

          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              background: sessionReady ? "#f0fdf4" : "#fff7ed",
              color: sessionReady ? "#166534" : "#9a3412",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {sessionReady
              ? "✓ Founder session detected. Authorized test is ready."
              : "⚠ Founder session not detected. Please sign in at /founder."}
          </div>

          <button
            type="button"
            onClick={() => void runSmokeTest()}
            disabled={!sessionReady || running}
            style={{
              width: "100%",
              minHeight: 54,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background: !sessionReady || running ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              fontWeight: 950,
              fontSize: 15,
              cursor: !sessionReady || running ? "default" : "pointer",
            }}
          >
            {running ? "Running Redis verification…" : "▶ Run Real Redis Smoke Test"}
          </button>

          <p
            style={{
              margin: "12px 0 0",
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            The test uses a unique temporary key and attempts cleanup
            even if a test step fails.
          </p>
        </section>

        <section
          style={{
            marginTop: 16,
            padding: 18,
            border: "1px solid #dbe3f0",
            borderRadius: 20,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 17 }}>
              Verification Pipeline
            </h2>

            <span
              style={{
                fontSize: 12,
                fontWeight: 950,
                color: getStatusColor(overall),
              }}
            >
              {overall}
            </span>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            {steps.map((step, index) => {
              const passed = checks[step.key] === true;
              const failed =
                result?.status === "FAIL" &&
                result.stage ===
                  step.key.toUpperCase().replace("VALUEMATCH", "COMPARE");

              const state = passed
                ? "PASS"
                : failed
                  ? "FAIL"
                  : result
                    ? "NOT PASSED"
                    : "WAITING";

              return (
                <div
                  key={step.key}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: 14,
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    background: passed ? "#f0fdf4" : "#ffffff",
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 34,
                      height: 34,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 11,
                      background: passed ? "#dcfce7" : "#f1f5f9",
                      color: passed ? "#15803d" : "#64748b",
                      fontWeight: 950,
                    }}
                  >
                    {passed ? "✓" : index + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>
                      {step.label}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      {step.detail}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 950,
                      color: passed ? "#15803d" : "#64748b",
                    }}
                  >
                    {state}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {result && (
          <section
            style={{
              marginTop: 16,
              padding: 18,
              border: "1px solid #dbe3f0",
              borderRadius: 20,
              background: "#ffffff",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 17 }}>
              Execution Evidence
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                marginTop: 16,
              }}
            >
              <Evidence label="HTTP STATUS" value={String(httpStatus ?? "—")} />
              <Evidence label="DURATION" value={duration === null ? "—" : `${duration} ms`} />
              <Evidence label="REDIS MODE" value={result.redisMode ?? "—"} />
              <Evidence label="FAILED STAGE" value={result.stage ?? "—"} />
            </div>

            {result.testId && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>
                  TEST ID
                </div>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 12,
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                  }}
                >
                  {result.testId}
                </div>
              </div>
            )}

            {result.summary && (
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 12,
                  background: "#f0fdf4",
                  color: "#166534",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {result.summary}
              </div>
            )}

            {result.error && (
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 12,
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontSize: 13,
                  lineHeight: 1.6,
                  wordBreak: "break-word",
                }}
              >
                <strong>Server Error</strong>
                <div style={{ marginTop: 6 }}>{result.error}</div>
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                fontSize: 11,
                color: "#64748b",
              }}
            >
              Server timestamp: {result.timestamp ?? "—"}
            </div>
          </section>
        )}

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: 13,
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            {error}
          </div>
        )}

        <footer
          style={{
            marginTop: 18,
            color: "#64748b",
            fontSize: 11,
            lineHeight: 1.7,
            textAlign: "center",
          }}
        >
          AIOS Alpha · Founder-only diagnostic · {API_PATH}
        </footer>
      </div>
    </main>
  );
}

function Evidence({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 13,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 900 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          fontWeight: 900,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
