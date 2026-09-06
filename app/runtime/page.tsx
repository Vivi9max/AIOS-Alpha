"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import CoreVerificationPanel from "./CoreVerificationPanel";
import AutonomousLoopRegressionPanel from "./AutonomousLoopRegressionPanel";useLanguage,

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";
  
import {
  APP_CONFIG,
} from "@/lib/config/app";

type RuntimeHealthStatus =
  | "online"
  | "degraded"
  | "offline";

interface RuntimeStatus {
  success: boolean;

  runtime: {
    id: string;
    stage: string;
    version: string;
    versionLabel?: string;
    codename: string;
  };

  status: RuntimeHealthStatus;

  provider: string;

  currentProvider?: string;

  providers?: string[];

  memoryCount: number;

  timestamp: number;

  providerRuntime?: {
    provider: string;
    status:
      | "ready"
      | "unconfigured"
      | "failed";
    lastLatencyMs:
      | number
      | null;
    lastSuccessAt:
      | number
      | null;
    lastFailureAt:
      | number
      | null;
    lastError:
      | string
      | null;
  };

  health?: {
    status: RuntimeHealthStatus;
    reasons: string[];
  };

  modules?: {
    chat: boolean;
    memory: boolean;
    planner: boolean;
    execution: boolean;
  };
}

function formatTime(
  value: number | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  try {
    return new Date(
      value,
    ).toLocaleString();
  } catch {
    return "—";
  }
}

export default function RuntimePage() {
  const {
    t,
  } =
    useLanguage();

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
    useState<string | null>(
      null,
    );

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/runtime/status",
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as
              RuntimeStatus;

          if (
            !response.ok &&
            !result
          ) {
            throw new Error(
              t(
                "runtime.loadError",
              ),
            );
          }

          setData(
            result,
          );
        } catch (
          caught
        ) {
          setError(
            caught instanceof
              Error
              ? caught.message
              : t(
                  "runtime.loadError",
                ),
          );
        } finally {
          setLoading(false);
        }
      },
      [t],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const healthStatus =
    data?.health?.status ??
    data?.status ??
    "offline";

  const healthReasons =
    data?.health?.reasons ??
    [];

  const providerRuntime =
    data?.providerRuntime;

  const moduleState =
    data?.modules;

  return (
    <WorkspaceShell>
      <main
        style={{
          maxWidth:
            1180,

          margin:
            "0 auto",

          padding:
            "28px 20px 60px",
        }}
      >
        <header
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "flex-start",

            gap:
              20,

            flexWrap:
              "wrap",
          }}
        >
          <div>
            <div
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                padding:
                  "5px 9px",

                borderRadius:
                  999,

                background:
                  "#f1f5f9",

                color:
                  "#475569",

                fontSize:
                  11,

                fontWeight:
                  900,

                letterSpacing:
                  "0.08em",
              }}
            >
              {APP_CONFIG.badge}
            </div>

            <h1
              style={{
                margin:
                  "12px 0 0",

                fontSize:
                  38,

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
                maxWidth:
                  720,

                margin:
                  "10px 0 0",

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
              void load()
            }
            disabled={
              loading
            }
            style={{
              minHeight:
                42,

              padding:
                "0 16px",

              border:
                0,

              borderRadius:
                12,

              background:
                "#111827",

              color:
                "#ffffff",

              fontWeight:
                800,

              cursor:
                loading
                  ? "wait"
                  : "pointer",

              opacity:
                loading
                  ? 0.7
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
        </header>

        {error && (
          <section
            style={{
              marginTop:
                18,

              padding:
                16,

              borderRadius:
                16,

              background:
                "#fef2f2",

              border:
                "1px solid #fecaca",

              color:
                "#991b1b",
            }}
          >
            {error}
          </section>
        )}

        <section
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",

            gap:
              12,

            marginTop:
              20,
          }}
        >
          <StatusCard
            label="Runtime Status"
            value={
              loading
                ? t(
                    "runtime.checking",
                  )
                : healthStatus.toUpperCase()
            }
            detail={
              healthReasons.length >
              0
                ? healthReasons[0]
                : t(
                    "runtime.success",
                  )
            }
          />

          <StatusCard
            label="Provider"
            value={
              data?.currentProvider ??
              data?.provider ??
              "—"
            }
            detail={
              providerRuntime
                ? providerRuntime.status
                : "—"
            }
          />

          <StatusCard
            label="Memory"
            value={
              data
                ? String(
                    data.memoryCount,
                  )
                : "—"
            }
            detail={t(
              "runtime.memoryNote",
            )}
          />

          <StatusCard
            label="Latency"
            value={
              providerRuntime
                ?.lastLatencyMs !==
              null &&
              providerRuntime
                ?.lastLatencyMs !==
                undefined
                ? `${providerRuntime.lastLatencyMs} ms`
                : "—"
            }
            detail={t(
              "runtime.latencyNote",
            )}
          />

          <StatusCard
            label="Last Run"
            value={
              formatTime(
                providerRuntime
                  ?.lastSuccessAt,
              )
            }
            detail={
              providerRuntime
                ?.lastError ??
              t(
                "runtime.noRuns",
              )
            }
          />
        </section>

        <section
          style={{
            marginTop:
              20,

            padding:
              20,

            borderRadius:
              20,

            border:
              "1px solid #e5e7eb",

            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap:
                12,

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin:
                    0,

                  color:
                    "#64748b",

                  fontSize:
                    12,

                  fontWeight:
                    900,

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

                  fontSize:
                    24,
                }}
              >
                {APP_CONFIG.fullTitle}
              </h2>
            </div>

            <div
              style={{
                color:
                  "#64748b",

                fontSize:
                  13,
              }}
            >
              {APP_CONFIG.codename}
            </div>
          </div>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",

              gap:
                10,

              marginTop:
                18,
            }}
          >
            <ModuleCard
              label="Chat"
              enabled={
                moduleState?.chat ??
                true
              }
            />

            <ModuleCard
              label="Memory"
              enabled={
                moduleState?.memory ??
                true
              }
            />

            <ModuleCard
              label="Planner"
              enabled={
                moduleState?.planner ??
                true
              }
            />

            <ModuleCard
              label="Execution"
              enabled={
                moduleState?.execution ??
                true
              }
            />
          </div>
        </section>

        <CoreVerificationPanel />

        <AutonomousLoopRegressionPanel />

        <section
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",

            gap:
              12,

            marginTop:
              18,
          }}
        >
          <NavigationCard
            href="/planner"
            title={t(
              "runtime.openPlanner",
            )}
            description={t(
              "runtime.openPlannerDescription",
            )}
          />

          <NavigationCard
            href="/brain"
            title={t(
              "runtime.openConsole",
            )}
            description={t(
              "runtime.openConsoleDescription",
            )}
          />

          <NavigationCard
            href="/runtime/trace"
            title={t(
              "runtime.openTrace",
            )}
            description={t(
              "runtime.openTraceDescription",
            )}
          />
        </section>
      </main>
    </WorkspaceShell>
  );
}

function StatusCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section
      style={{
        padding:
          18,

        borderRadius:
          18,

        border:
          "1px solid #e5e7eb",

        background:
          "#ffffff",
      }}
    >
      <div
        style={{
          color:
            "#64748b",

          fontSize:
            11,

          fontWeight:
            900,

          letterSpacing:
            "0.06em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            8,

          fontSize:
            22,

          fontWeight:
            850,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop:
            6,

          color:
            "#64748b",

          fontSize:
            12,

          lineHeight:
            1.5,
        }}
      >
        {detail}
      </div>
    </section>
  );
}

function ModuleCard({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div
      style={{
        padding:
          14,

        borderRadius:
          14,

        background:
          "#f8fafc",

        border:
          "1px solid #f1f5f9",
      }}
    >
      <div
        style={{
          fontWeight:
            800,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            5,

          color:
            enabled
              ? "#166534"
              : "#991b1b",

          fontSize:
            12,

          fontWeight:
            800,
        }}
      >
        {enabled
          ? "READY"
          : "OFFLINE"}
      </div>
    </div>
  );
}

function NavigationCard({
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

        padding:
          18,

        borderRadius:
          18,

        border:
          "1px solid #e5e7eb",

        background:
          "#ffffff",

        color:
          "inherit",

        textDecoration:
          "none",
      }}
    >
      <strong>
        {title}
      </strong>

      <p
        style={{
          margin:
            "7px 0 0",

          color:
            "#64748b",

          lineHeight:
            1.6,

          fontSize:
            13,
        }}
      >
        {description}
      </p>
    </Link>
  );
}
