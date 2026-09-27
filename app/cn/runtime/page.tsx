"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

interface CNRuntimeStatus {
  success?: boolean;
  service?: string;
  runtime?: string;
  runtimeVersion?: string;
  configuredProviders?: {
    deepseek?: boolean;
    qwen?: boolean;
  };
  selectedProvider?: string;
  fallbackProvider?: string;
  capabilities?: {
    chat?: boolean;
    inputBridge?: boolean;
    vision?: boolean;
    webIntelligence?: boolean;
    plannerDispatch?: boolean;
    tradingExecution?: boolean;
    commercialActualWrite?: boolean;
  };
  safetyBoundary?: {
    plannerDispatched?: boolean;
    tradingExecuted?: boolean;
    commercialActualWritten?: boolean;
  };
}

export default function CNRuntimePage() {
  const [
    data,
    setData,
  ] =
    useState<CNRuntimeStatus | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const loadRuntime =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/cn/runtime",
              {
                cache:
                  "no-store",
              },
            );

          if (
            !response.ok
          ) {
            throw new Error(
              "CN Runtime unavailable.",
            );
          }

          const result =
            (await response.json()) as CNRuntimeStatus;

          setData(
            result,
          );
        } catch {
          setData(null);
          setError(
            "无法读取 AIOS CN Runtime 状态。",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadRuntime();
  }, [
    loadRuntime,
  ]);

  const deepseek =
    data
      ?.configuredProviders
      ?.deepseek === true;

  const qwen =
    data
      ?.configuredProviders
      ?.qwen === true;

  const capabilityRows = [
    [
      "Chat",
      data?.capabilities?.chat,
    ],
    [
      "Input Bridge",
      data?.capabilities?.inputBridge,
    ],
    [
      "Vision",
      data?.capabilities?.vision,
    ],
    [
      "Web Intelligence",
      data?.capabilities?.webIntelligence,
    ],
    [
      "Planner Dispatch",
      data?.capabilities?.plannerDispatch,
    ],
    [
      "Trading Execution",
      data?.capabilities?.tradingExecution,
    ],
    [
      "Commercial Actual Write",
      data?.capabilities?.commercialActualWrite,
    ],
  ] as const;

  return (
    <WorkspaceShell>
      <main
        style={{
          width:
            "100%",
          maxWidth:
            900,
          margin:
            "0 auto",
          padding:
            "8px 8px 32px",
          boxSizing:
            "border-box",
        }}
      >
        <header
          style={{
            marginBottom:
              20,
          }}
        >
          <p
            style={{
              margin:
                0,
              color:
                "#b91c1c",
              fontSize:
                12,
              fontWeight:
                800,
              letterSpacing:
                "0.08em",
            }}
          >
            AIOS CN
          </p>

          <h1
            style={{
              margin:
                "7px 0 8px",
              fontSize:
                30,
              fontWeight:
                850,
            }}
          >
            CN Runtime
          </h1>

          <p
            style={{
              margin:
                0,
              color:
                "#64748b",
              lineHeight:
                1.6,
            }}
          >
            查看 AIOS CN 当前 Provider、能力边界与安全状态。
          </p>
        </header>

        {error && (
          <div
            style={{
              marginBottom:
                16,
              padding:
                "12px 14px",
              border:
                "1px solid #fecaca",
              borderRadius:
                12,
              background:
                "#fff7f7",
              color:
                "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            padding:
              20,
            marginBottom:
              16,
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              16,
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap:
                12,
            }}
          >
            <RuntimeCard
              label="Runtime"
              value={
                loading
                  ? "Loading"
                  : data?.runtime ??
                    "Unknown"
              }
            />

            <RuntimeCard
              label="Version"
              value={
                loading
                  ? "Loading"
                  : data?.runtimeVersion ??
                    "Unknown"
              }
            />

            <RuntimeCard
              label="Selected Provider"
              value={
                loading
                  ? "Loading"
                  : data?.selectedProvider ??
                    "Unknown"
              }
            />

            <RuntimeCard
              label="Fallback Provider"
              value={
                loading
                  ? "Loading"
                  : data?.fallbackProvider ??
                    "None"
              }
            />
          </div>
        </section>

        <section
          style={{
            padding:
              20,
            marginBottom:
              16,
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              16,
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                12,
              marginBottom:
                14,
            }}
          >
            <h2
              style={{
                margin:
                  0,
                fontSize:
                  18,
              }}
            >
              CN Providers
            </h2>

            <button
              type="button"
              onClick={
                loadRuntime
              }
              disabled={
                loading
              }
              style={{
                padding:
                  "8px 11px",
                border:
                  "1px solid #d1d5db",
                borderRadius:
                  9,
                background:
                  "#ffffff",
                fontWeight:
                  700,
                opacity:
                  loading
                    ? 0.6
                    : 1,
              }}
            >
              {loading
                ? "刷新中..."
                : "刷新"}
            </button>
          </div>

          <ProviderRow
            name="DeepSeek"
            configured={
              deepseek
            }
            primary={
              data?.selectedProvider ===
              "deepseek"
            }
          />

          <ProviderRow
            name="Qwen"
            configured={
              qwen
            }
            primary={
              data?.selectedProvider ===
              "qwen"
            }
          />
        </section>

        <section
          style={{
            padding:
              20,
            marginBottom:
              16,
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              16,
          }}
        >
          <h2
            style={{
              margin:
                "0 0 14px",
              fontSize:
                18,
            }}
          >
            CN Capabilities
          </h2>

          {capabilityRows.map(
            ([
              label,
              enabled,
            ]) => (
              <StatusRow
                key={
                  label
                }
                label={
                  label
                }
                enabled={
                  enabled ===
                  true
                }
              />
            ),
          )}
        </section>

        <section
          style={{
            padding:
              20,
            background:
              "#fff7f7",
            border:
              "1px solid #fecaca",
            borderRadius:
              16,
          }}
        >
          <h2
            style={{
              margin:
                "0 0 12px",
              fontSize:
                18,
              color:
                "#991b1b",
            }}
          >
            Safety Boundary
          </h2>

          <BoundaryRow
            label="Planner Dispatch"
            blocked={
              data?.safetyBoundary
                ?.plannerDispatched !==
              true
            }
          />

          <BoundaryRow
            label="Trading Execution"
            blocked={
              data?.safetyBoundary
                ?.tradingExecuted !==
              true
            }
          />

          <BoundaryRow
            label="Commercial Actual Write"
            blocked={
              data?.safetyBoundary
                ?.commercialActualWritten !==
              true
            }
          />
        </section>
      </main>
    </WorkspaceShell>
  );
}

function RuntimeCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding:
          14,
        borderRadius:
          12,
        background:
          "#f8fafc",
        border:
          "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            12,
          fontWeight:
            700,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display:
            "block",
          marginTop:
            7,
          color:
            "#111827",
          fontSize:
            16,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ProviderRow({
  name,
  configured,
  primary,
}: {
  name: string;
  configured: boolean;
  primary: boolean;
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap:
          12,
        padding:
          "12px 0",
        borderTop:
          "1px solid #f1f5f9",
      }}
    >
      <div>
        <strong>
          {name}
        </strong>

        {primary && (
          <span
            style={{
              marginLeft:
                8,
              padding:
                "3px 7px",
              borderRadius:
                999,
              background:
                "#fef2f2",
              color:
                "#b91c1c",
              fontSize:
                10,
              fontWeight:
                800,
            }}
          >
            PRIMARY
          </span>
        )}
      </div>

      <span
        style={{
          color:
            configured
              ? "#15803d"
              : "#94a3b8",
          fontSize:
            13,
          fontWeight:
            700,
        }}
      >
        {configured
          ? "Configured"
          : "Not configured"}
      </span>
    </div>
  );
}

function StatusRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap:
          12,
        padding:
          "10px 0",
        borderTop:
          "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          color:
            "#475569",
          fontSize:
            13,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color:
            enabled
              ? "#15803d"
              : "#94a3b8",
          fontSize:
            13,
        }}
      >
        {enabled
          ? "Available"
          : "Not available"}
      </strong>
    </div>
  );
}

function BoundaryRow({
  label,
  blocked,
}: {
  label: string;
  blocked: boolean;
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap:
          12,
        padding:
          "10px 0",
        borderTop:
          "1px solid #fee2e2",
      }}
    >
      <span
        style={{
          color:
            "#7f1d1d",
          fontSize:
            13,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color:
            blocked
              ? "#15803d"
              : "#b91c1c",
          fontSize:
            13,
        }}
      >
        {blocked
          ? "Blocked"
          : "Active"}
      </strong>
    </div>
  );
}
