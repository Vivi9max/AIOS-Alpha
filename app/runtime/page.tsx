"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import CoreVerificationPanel from "./CoreVerificationPanel";

import PlannerHealthPanel from "./PlannerHealthPanel";

import AutonomousLoopRegressionPanel from "./AutonomousLoopRegressionPanel";

type RuntimeHealthStatus =
  | "online"
  | "degraded"
  | "offline";

interface RuntimeModuleStatus {
  id: string;
  name: string;
  status:
    | "ready"
    | "degraded"
    | "offline";
  description?: string;
}

interface RuntimeProviderStatus {
  name: string;
  configured: boolean;
  enabled: boolean;
  success: boolean;
  latencyMs: number | null;
  lastRunAt: number | null;
  error: string | null;
}

interface RuntimeStatus {
  success: boolean;

  runtime: {
    id: string;
    stage: string;
    version: string;
    versionLabel: string;
    codename: string;
  };

  status: RuntimeHealthStatus;

  provider: string;

  memoryCount: number;

  timestamp: number;

  providerRuntime?: RuntimeProviderStatus;

  health?: {
    reasons: string[];
  };

  modules?: RuntimeModuleStatus[];
}

function formatTime(
  value: number | null | undefined,
): string {
  if (!value) {
    return "--";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "--";
  }
}

export default function RuntimePage() {
  const {
    t,
  } = useLanguage();

  const [
    data,
    setData,
  ] =
    useState<
      RuntimeStatus | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState(false);

  const loadStatus =
    useCallback(
      async () => {
        setLoading(true);
        setError(false);

        try {
          const response =
            await fetch(
              "/api/runtime/status",
              {
                cache:
                  "no-store",
              },
            );

          if (!response.ok) {
            throw new Error(
              "Runtime status request failed.",
            );
          }

          const result =
            (await response.json()) as
              RuntimeStatus;

          setData(result);
        } catch {
          setData(null);
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadStatus();

    const interval =
      window.setInterval(
        () => {
          void loadStatus();
        },
        30000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [loadStatus]);

  const runtimeStatus =
    data?.status ??
    "offline";

  const statusLabel =
    loading
      ? t(
          "runtime.checking",
        )
      : runtimeStatus ===
          "online"
        ? t(
            "runtime.success",
          )
        : runtimeStatus ===
            "degraded"
          ? "Degraded"
          : t(
              "runtime.loadError",
            );

  return (
    <WorkspaceShell>
      <main
        style={{
          maxWidth: 1200,
          margin:
            "0 auto",
          padding:
            "32px 20px 60px",
        }}
      >
        <section
          style={{
            marginBottom: 24,
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
              gap: 16,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#64748b",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing:
                    "0.08em",
                  textTransform:
                    "uppercase",
                }}
              >
                {APP_CONFIG.badge}
              </div>

              <h1
                style={{
                  margin:
                    "8px 0 0",
                  fontSize: 36,
                  lineHeight:
                    1.1,
                }}
              >
                {t(
                  "runtime.title",
                )}
              </h1>

              <p
                style={{
                  margin:
                    "10px 0 0",
                  maxWidth: 760,
                  color:
                    "#64748b",
                  lineHeight:
                    1.7,
                }}
              >
                {t(
                  "runtime.description",
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadStatus()
              }
              disabled={loading}
              style={{
                minHeight: 42,
                padding:
                  "0 16px",
                border:
                  "1px solid #e2e8f0",
                borderRadius: 12,
                background:
                  "#ffffff",
                color:
                  "#0f172a",
                fontWeight: 800,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
                opacity:
                  loading
                    ? 0.65
                    : 1,
              }}
            >
              {loading
                ? t(
                    "runtime.checking",
                  )
                : t(
                    "runtime.refresh",
                  )}
            </button>
          </div>
        </section>

        {error && (
          <section
            style={{
              marginBottom: 18,
              padding: 16,
              borderRadius: 16,
              border:
                "1px solid #fecaca",
              background:
                "#fef2f2",
              color:
                "#991b1b",
              lineHeight:
                1.6,
            }}
          >
            {t(
              "runtime.loadError",
            )}
          </section>
        )}

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <RuntimeCard
            label="Runtime Status"
            value={
              statusLabel
            }
            description={
              data?.health
                ?.reasons
                ?.join(" ") ||
              APP_CONFIG
                .codename
            }
          />

          <RuntimeCard
            label="Provider"
            value={
              data?.provider ??
              "--"
            }
            description={
              data?.providerRuntime
                ?.configured
                ? "Provider configured"
                : "Provider configuration not confirmed"
            }
          />

          <RuntimeCard
            label="Memory"
            value={
              data
                ? String(
                    data.memoryCount,
                  )
                : "--"
            }
            description={t(
              "runtime.memoryNote",
            )}
          />

          <RuntimeCard
            label="Latency"
            value={
              data?.providerRuntime
                ?.latencyMs !=
              null
                ? `${data.providerRuntime.latencyMs} ms`
                : "--"
            }
            description={t(
              "runtime.latencyNote",
            )}
          />
        </section>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <RuntimeCard
            label="Last Provider Run"
            value={formatTime(
              data?.providerRuntime
                ?.lastRunAt,
            )}
            description={
              data?.providerRuntime
                ?.error ??
              t(
                "runtime.noRuns",
              )
            }
          />

          <RuntimeCard
            label="Runtime Version"
            value={
              data?.runtime
                ?.versionLabel ??
              APP_CONFIG
                .version
            }
            description={
              data?.runtime
                ?.codename ??
              APP_CONFIG
                .codename
            }
          />
        </section>

        {data?.modules &&
          data.modules.length >
            0 && (
            <section
              style={{
                marginBottom: 18,
                padding: 20,
                borderRadius: 20,
                border:
                  "1px solid #e5e7eb",
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  marginBottom: 14,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color:
                      "#64748b",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing:
                      "0.08em",
                  }}
                >
                  RUNTIME MODULES
                </p>

                <h2
                  style={{
                    margin:
                      "6px 0 0",
                    fontSize: 24,
                  }}
                >
                  Runtime Modules
                </h2>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {data.modules.map(
                  (module) => (
                    <div
                      key={
                        module.id
                      }
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        background:
                          "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap: 10,
                        }}
                      >
                        <strong>
                          {
                            module.name
                          }
                        </strong>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          {
                            module.status
                          }
                        </span>
                      </div>

                      {module.description && (
                        <p
                          style={{
                            margin:
                              "7px 0 0",
                            color:
                              "#64748b",
                            fontSize: 13,
                            lineHeight:
                              1.6,
                          }}
                        >
                          {
                            module.description
                          }
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

        <section
          style={{
            marginBottom: 18,
          }}
        >
          <CoreVerificationPanel />
        </section>

        <section
          style={{
            marginBottom: 18,
          }}
        >
          <PlannerHealthPanel />
        </section>

        <section
          style={{
            marginBottom: 18,
          }}
        >
          <AutonomousLoopRegressionPanel />
        </section>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <RuntimeLink
            href="/planner"
            title="Planner"
            description={t(
              "runtime.openPlannerDescription",
            )}
          />

          <RuntimeLink
            href="/brain"
            title="Brain"
            description={t(
              "runtime.openConsoleDescription",
            )}
          />

          <RuntimeLink
            href="/runtime/trace"
            title="Runtime Trace"
            description={t(
              "runtime.openTraceDescription",
            )}
          />
        </section>
      </main>
    </WorkspaceShell>
  );
}

function RuntimeCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border:
          "1px solid #e5e7eb",
        background:
          "#ffffff",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing:
            "0.06em",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 7,
          fontSize: 21,
          fontWeight: 900,
          overflowWrap:
            "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 7,
          color:
            "#64748b",
          fontSize: 12,
          lineHeight:
            1.55,
        }}
      >
        {description}
      </div>
    </div>
  );
}

function RuntimeLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display:
          "block",
        padding: 18,
        borderRadius: 18,
        border:
          "1px solid #e5e7eb",
        background:
          "#ffffff",
        color:
          "#0f172a",
        textDecoration:
          "none",
      }}
    >
      <strong
        style={{
          fontSize: 17,
        }}
      >
        {title}
      </strong>

      <p
        style={{
          margin:
            "7px 0 0",
          color:
            "#64748b",
          fontSize: 13,
          lineHeight:
            1.6,
        }}
      >
        {description}
      </p>
    </Link>
  );
}
