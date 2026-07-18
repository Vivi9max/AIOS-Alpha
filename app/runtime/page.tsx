"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface RuntimeModule {
  enabled?: boolean;
  status?: string;
}

interface RuntimeStatus {
  success: boolean;
  runtime?: string;
  versionLabel?: string;
  status?: string;
  provider?: string;
  memoryCount?: number;
  timestamp?: number;

  providerRuntime?: {
    success?: boolean;
    latencyMs?: number;
    fallbackUsed?: boolean;
    lastRequestAt?: number;
    error?: string;
  };

  modules?: Record<
    string,
    RuntimeModule
  >;
}

function formatTime(
  timestamp?: number
): string {
  if (!timestamp) {
    return "尚无执行记录";
  }

  return new Date(
    timestamp
  ).toLocaleString(
    "zh-CN",
    {
      hour12: false,
    }
  );
}

export default function RuntimePage() {
  const [data, setData] =
    useState<RuntimeStatus | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadStatus =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/runtime/status",
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            RuntimeStatus;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            "Runtime 状态读取失败。"
          );
        }

        setData(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Runtime 状态读取失败。"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const modules =
    Object.entries(
      data?.modules ?? {}
    );

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
        <header
          style={{
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
            AIOS System
          </p>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 37,
              lineHeight: 1.15,
            }}
          >
            ⚡ Runtime Control Center
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#64748b",
              lineHeight: 1.65,
            }}
          >
            查看 AIOS 是否在线、当前模型、系统模块和最近执行状态。
          </p>
        </header>

        <section
          style={{
            padding: 21,
            borderRadius: 22,
            background: "#111827",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 16,
              alignItems:
                "flex-start",
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
                RUNTIME STATUS
              </p>

              <h2
                style={{
                  margin: "8px 0 0",
                  fontSize: 34,
                }}
              >
                {loading
                  ? "检查中…"
                  : data?.status ===
                      "online"
                    ? "在线"
                    : "离线"}
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#cbd5e1",
                }}
              >
                {data?.runtime ??
                  "aios-alpha"}{" "}
                ·{" "}
                {data?.versionLabel ??
                  "Alpha"}
              </p>
            </div>

            <span
              style={{
                padding:
                  "8px 12px",
                borderRadius: 999,
                background:
                  data?.status ===
                  "online"
                    ? "#dcfce7"
                    : "#fee2e2",
                color:
                  data?.status ===
                  "online"
                    ? "#15803d"
                    : "#b91c1c",
                fontWeight: 900,
              }}
            >
              {data?.status ===
              "online"
                ? "READY"
                : "CHECK"}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadStatus()
            }
            style={{
              marginTop: 18,
              minHeight: 46,
              padding: "0 18px",
              border: 0,
              borderRadius: 13,
              background: "#ffffff",
              color: "#111827",
              fontWeight: 900,
            }}
          >
            刷新状态
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

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          <StatusCard
            label="Provider"
            value={
              data?.provider ?? "—"
            }
            note="当前 AI 模型"
          />

          <StatusCard
            label="Memory"
            value={String(
              data?.memoryCount ?? 0
            )}
            note="当前记忆记录"
          />

          <StatusCard
            label="Latency"
            value={`${
              data?.providerRuntime
                ?.latencyMs ?? 0
            } ms`}
            note="最近请求耗时"
          />

          <StatusCard
            label="Last Run"
            value={
              data?.providerRuntime
                ?.success
                ? "成功"
                : "暂无"
            }
            note={formatTime(
              data?.providerRuntime
                ?.lastRequestAt
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
          <h2
            style={{
              margin: 0,
            }}
          >
            Runtime Modules
          </h2>

          <div
            style={{
              marginTop: 12,
            }}
          >
            {modules.length === 0 ? (
              <p
                style={{
                  color: "#64748b",
                }}
              >
                正在读取模块状态…
              </p>
            ) : (
              modules.map(
                ([name, module]) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      padding:
                        "13px 0",
                      borderBottom:
                        "1px solid #f1f5f9",
                    }}
                  >
                    <strong
                      style={{
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {name}
                    </strong>

                    <span
                      style={{
                        color:
                          module.enabled
                            ? "#15803d"
                            : "#b91c1c",
                        fontWeight: 800,
                      }}
                    >
                      {module.enabled
                        ? module.status ??
                          "ready"
                        : "disabled"}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: 10,
            marginTop: 18,
          }}
        >
          <RuntimeLink
            href="/planner"
            label="🧭 打开 Planner"
            description="输入目标，由 AIOS 生成计划并调度执行"
          />

          <RuntimeLink
            href="/brain"
            label="🧠 打开 Runtime Console"
            description="直接向 Runtime 提交单次任务"
          />

          <RuntimeLink
            href="/runtime/trace"
            label="📍 查看 Execution Trace"
            description="查看最近一次真实执行过程"
          />
        </section>
      </main>
    </WorkspaceShell>
  );
}

function StatusCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 17,
        borderRadius: 18,
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
          fontSize: 25,
          fontWeight: 900,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin: "6px 0 0",
          color: "#94a3b8",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        {note}
      </p>
    </div>
  );
}

function RuntimeLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "16px 18px",
        borderRadius: 15,
        border:
          "1px solid #e5e7eb",
        background: "#ffffff",
        color: "#111827",
        textDecoration: "none",
      }}
    >
      <strong>{label}</strong>

      <p
        style={{
          margin: "5px 0 0",
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </Link>
  );
}