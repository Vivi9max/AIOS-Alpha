"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface CapabilityTraceItem {
  capability?: string;
  status?: string;
  success?: boolean;
  durationMs?: number;
  error?: string;
}

interface RuntimeTrace {
  requestId?: string;
  promptPreview?: string;
  provider?: string;
  success?: boolean;
  fallbackUsed?: boolean;
  latencyMs?: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  capabilityTrace?: CapabilityTraceItem[];
}

interface TraceResponse {
  success: boolean;
  hasTrace?: boolean;
  trace?: RuntimeTrace | null;
  timestamp?: number;
}

function formatTime(
  value?: number
): string {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleString(
    "zh-CN",
    {
      hour12: false,
    }
  );
}

export default function RuntimeTracePage() {
  const [data, setData] =
    useState<TraceResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadTrace =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/runtime/trace",
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            TraceResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            "Execution Trace 读取失败。"
          );
        }

        setData(result);
      } catch (traceError) {
        setError(
          traceError instanceof Error
            ? traceError.message
            : "Execution Trace 读取失败。"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadTrace();
  }, [loadTrace]);

  const trace =
    data?.trace ?? null;

  const capabilities =
    trace?.capabilityTrace ?? [];

  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 840,
          margin: "0 auto",
          color: "#111827",
        }}
      >
        <Link
          href="/runtime"
          style={{
            color: "#475569",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          ← 返回 Runtime
        </Link>

        <header
          style={{
            marginTop: 20,
            marginBottom: 22,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            AIOS Runtime
          </p>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 37,
            }}
          >
            📍 Execution Trace
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            查看 AIOS 最近一次请求实际调用了哪些能力，以及是否执行成功。
          </p>
        </header>

        <section
          style={{
            padding: 20,
            borderRadius: 20,
            background: "#111827",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#93c5fd",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                LAST EXECUTION
              </p>

              <h2
                style={{
                  margin: "8px 0 0",
                }}
              >
                {loading
                  ? "读取中…"
                  : trace?.success
                    ? "执行成功"
                    : data?.hasTrace
                      ? "执行失败"
                      : "尚无执行记录"}
              </h2>
            </div>

            <span
              style={{
                padding:
                  "7px 11px",
                borderRadius: 999,
                background:
                  trace?.success
                    ? "#dcfce7"
                    : "#f3f4f6",
                color:
                  trace?.success
                    ? "#15803d"
                    : "#64748b",
                fontWeight: 900,
              }}
            >
              {trace?.success
                ? "SUCCESS"
                : "EMPTY"}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadTrace()
            }
            style={{
              marginTop: 17,
              minHeight: 44,
              padding: "0 17px",
              border: 0,
              borderRadius: 12,
              background: "#ffffff",
              color: "#111827",
              fontWeight: 900,
            }}
          >
            刷新记录
          </button>
        </section>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: "#fff1f2",
              color: "#be123c",
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {trace && (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 12,
                marginTop: 18,
              }}
            >
              <TraceCard
                label="Provider"
                value={
                  trace.provider ?? "—"
                }
              />

              <TraceCard
                label="Latency"
                value={`${
                  trace.latencyMs ?? 0
                } ms`}
              />

              <TraceCard
                label="Fallback"
                value={
                  trace.fallbackUsed
                    ? "已使用"
                    : "未使用"
                }
              />

              <TraceCard
                label="Completed"
                value={formatTime(
                  trace.completedAt
                )}
              />
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 20,
                borderRadius: 20,
                border:
                  "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                USER REQUEST
              </p>

              <p
                style={{
                  margin: "9px 0 0",
                  lineHeight: 1.65,
                  fontWeight: 700,
                }}
              >
                {trace.promptPreview ||
                  "没有请求摘要"}
              </p>
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 20,
                borderRadius: 20,
                border:
                  "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <h2
                style={{
                  margin: 0,
                }}
              >
                Capability Calls
              </h2>

              {capabilities.length ===
              0 ? (
                <p
                  style={{
                    margin:
                      "14px 0 0",
                    color: "#64748b",
                  }}
                >
                  本次记录没有独立能力调用，或尚未执行新的 Planner 任务。
                </p>
              ) : (
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  {capabilities.map(
                    (item, index) => (
                      <div
                        key={`${item.capability}-${index}`}
                        style={{
                          padding: 15,
                          borderRadius: 14,
                          background:
                            "#f8fafc",
                          border:
                            "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: 12,
                          }}
                        >
                          <strong>
                            {index + 1}.{" "}
                            {item.capability ??
                              "Runtime Capability"}
                          </strong>

                          <span
                            style={{
                              color:
                                item.success ===
                                  false
                                  ? "#b91c1c"
                                  : "#15803d",
                              fontWeight: 800,
                            }}
                          >
                            {item.status ??
                              (item.success ===
                              false
                                ? "failed"
                                : "completed")}
                          </span>
                        </div>

                        {typeof item.durationMs ===
                          "number" && (
                          <p
                            style={{
                              margin:
                                "7px 0 0",
                              color:
                                "#64748b",
                              fontSize: 13,
                            }}
                          >
                            耗时：
                            {
                              item.durationMs
                            }{" "}
                            ms
                          </p>
                        )}

                        {item.error && (
                          <p
                            style={{
                              margin:
                                "7px 0 0",
                              color:
                                "#b91c1c",
                            }}
                          >
                            {item.error}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {!loading &&
          !trace &&
          !error && (
            <section
              style={{
                marginTop: 18,
                padding: 22,
                borderRadius: 20,
                border:
                  "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <h2
                style={{
                  margin: 0,
                }}
              >
                暂无执行记录
              </h2>

              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.6,
                }}
              >
                先前往 Planner 点击“规划并执行”，这里就会显示最新执行过程。
              </p>

              <Link
                href="/planner"
                style={{
                  display:
                    "inline-block",
                  marginTop: 6,
                  padding:
                    "12px 16px",
                  borderRadius: 12,
                  background:
                    "#111827",
                  color: "#ffffff",
                  textDecoration:
                    "none",
                  fontWeight: 900,
                }}
              >
                打开 Planner →
              </Link>
            </section>
          )}
      </main>
    </WorkspaceShell>
  );
}

function TraceCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 16,
        borderRadius: 17,
        border:
          "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {label.toUpperCase()}
      </p>

      <p
        style={{
          margin: "8px 0 0",
          fontWeight: 900,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </p>
    </div>
  );
}