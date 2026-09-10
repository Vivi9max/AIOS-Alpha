"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

type VerificationStatus =
  | "VERIFIED"
  | "DEGRADED"
  | "FAILED";

type CheckStatus =
  | "pass"
  | "warn"
  | "fail";

interface VerificationCheck {
  id: string;
  status: CheckStatus;
  message: string;
}

interface VerificationResponse {
  verified?: boolean;
  status?: VerificationStatus;
  score?: number;

  runtime?: {
    id?: string;
    stage?: string;
    version?: string;
    codename?: string;
  };

  checks?: VerificationCheck[];

  summary?: {
    passed?: number;
    warnings?: number;
    failed?: number;
    total?: number;
  };

  timestamp?: number;
}

type PanelCopy = {
  title: string;
  description: string;
  run: string;
  running: string;
  verified: string;
  degraded: string;
  failed: string;
  unavailable: string;
  passed: string;
  warnings: string;
  failures: string;
  checks: string;
  runtime: string;
  lastVerified: string;
};

const COPY: Record<
  "en" | "zh-CN" | "ja",
  PanelCopy
> = {
  en: {
    title:
      "System Self-Verification",

    description:
      "Verify Runtime Core, Planner Health, Autonomous Loop Regression, and cross-layer consistency from the live AIOS runtime.",

    run:
      "Run verification",

    running:
      "Verifying…",

    verified:
      "VERIFIED",

    degraded:
      "DEGRADED",

    failed:
      "FAILED",

    unavailable:
      "Verification unavailable.",

    passed:
      "passed",

    warnings:
      "warnings",

    failures:
      "failures",

    checks:
      "Checks",

    runtime:
      "Runtime",

    lastVerified:
      "Last verified",
  },

  "zh-CN": {
    title:
      "系统自检",

    description:
      "从真实运行时验证 Runtime Core、Planner Health、Autonomous Loop Regression 以及跨层一致性。",

    run:
      "运行系统自检",

    running:
      "正在验证……",

    verified:
      "已验证",

    degraded:
      "降级",

    failed:
      "失败",

    unavailable:
      "系统自检暂时不可用。",

    passed:
      "通过",

    warnings:
      "警告",

    failures:
      "失败",

    checks:
      "检查项",

    runtime:
      "运行时",

    lastVerified:
      "最后验证",
  },

  ja: {
    title:
      "システム自己検証",

    description:
      "実際の AIOS Runtime から Runtime Core、Planner Health、Autonomous Loop Regression、レイヤー間整合性を検証します。",

    run:
      "システム検証を実行",

    running:
      "検証中…",

    verified:
      "検証済み",

    degraded:
      "低下",

    failed:
      "失敗",

    unavailable:
      "システム検証を利用できません。",

    passed:
      "成功",

    warnings:
      "警告",

    failures:
      "失敗",

    checks:
      "チェック",

    runtime:
      "ランタイム",

    lastVerified:
      "最終検証",
  },
};

function getCopy(
  locale: string,
): PanelCopy {
  if (
    locale === "zh-CN" ||
    locale === "ja"
  ) {
    return COPY[locale];
  }

  return COPY.en;
}

function statusLabel(
  status: VerificationStatus | undefined,
  copy: PanelCopy,
): string {
  switch (status) {
    case "VERIFIED":
      return copy.verified;

    case "DEGRADED":
      return copy.degraded;

    case "FAILED":
      return copy.failed;

    default:
      return "—";
  }
}

function statusSymbol(
  status: VerificationStatus | undefined,
): string {
  switch (status) {
    case "VERIFIED":
      return "✓";

    case "DEGRADED":
      return "△";

    case "FAILED":
      return "×";

    default:
      return "•";
  }
}

export default function SystemVerificationPanel() {
  const {
    locale,
  } = useLanguage();

  const copy =
    getCopy(locale);

  const [
    result,
    setResult,
  ] =
    useState<VerificationResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function runVerification() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/runtime/system-verification",
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          },
        );

      const data =
        (await response.json()) as VerificationResponse;

      if (
        !response.ok &&
        data.status !== "DEGRADED"
      ) {
        throw new Error(
          copy.unavailable,
        );
      }

      setResult(data);
    } catch {
      setResult(null);
      setError(
        copy.unavailable,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initialVerification() {
      try {
        const response =
          await fetch(
            "/api/runtime/system-verification",
            {
              method: "GET",
              cache: "no-store",
              credentials: "same-origin",
            },
          );

        const data =
          (await response.json()) as VerificationResponse;

        if (
          active &&
          (
            response.ok ||
            data.status ===
              "FAILED"
          )
        ) {
          setResult(data);
        }
      } catch {
        if (active) {
          setError(
            copy.unavailable,
          );
        }
      }
    }

    initialVerification();

    return () => {
      active = false;
    };
  }, [copy.unavailable]);

  const summary =
    result?.summary;

  const checks =
    result?.checks ?? [];

  return (
    <section
      style={{
        marginTop: 18,
        padding: 20,
        border:
          "1px solid #e2e8f0",
        borderRadius: 20,
        background:
          "#ffffff",
        boxShadow:
          "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
          gap: 16,
        }}
      >
        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing:
                "0.08em",
              textTransform:
                "uppercase",
            }}
          >
            AIOS Runtime
          </div>

          <h2
            style={{
              margin:
                "7px 0 0",
              color:
                "#0f172a",
              fontSize: 18,
              lineHeight: 1.3,
            }}
          >
            {copy.title}
          </h2>

          <p
            style={{
              margin:
                "7px 0 0",
              color:
                "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {copy.description}
          </p>
        </div>

        <button
          type="button"
          onClick={
            runVerification
          }
          disabled={loading}
          style={{
            flexShrink: 0,
            minHeight: 42,
            padding:
              "0 14px",
            border: 0,
            borderRadius: 12,
            background:
              loading
                ? "#cbd5e1"
                : "#0f172a",
            color:
              "#ffffff",
            fontSize: 13,
            fontWeight: 800,
            cursor:
              loading
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading
            ? copy.running
            : copy.run}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding:
              "11px 13px",
            border:
              "1px solid #fecaca",
            borderRadius: 12,
            background:
              "#fff7f7",
            color:
              "#b91c1c",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: 12,
              padding:
                "14px 15px",
              borderRadius: 14,
              background:
                result.status ===
                "VERIFIED"
                  ? "#f0fdf4"
                  : result.status ===
                      "DEGRADED"
                    ? "#fffbeb"
                    : "#fef2f2",
              border:
                result.status ===
                "VERIFIED"
                  ? "1px solid #bbf7d0"
                  : result.status ===
                      "DEGRADED"
                    ? "1px solid #fde68a"
                    : "1px solid #fecaca",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                {statusSymbol(
                  result.status,
                )}
              </span>

              <strong
                style={{
                  color:
                    "#0f172a",
                  fontSize: 14,
                }}
              >
                {statusLabel(
                  result.status,
                  copy,
                )}
              </strong>
            </div>

            <strong
              style={{
                color:
                  "#0f172a",
                fontSize: 20,
              }}
            >
              {typeof result.score ===
              "number"
                ? `${result.score}%`
                : "—"}
            </strong>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: 8,
              marginTop: 10,
            }}
          >
            <Metric
              value={
                summary?.passed ??
                0
              }
              label={
                copy.passed
              }
            />

            <Metric
              value={
                summary?.warnings ??
                0
              }
              label={
                copy.warnings
              }
            />

            <Metric
              value={
                summary?.failed ??
                0
              }
              label={
                copy.failures
              }
            />
          </div>

          {result.runtime && (
            <div
              style={{
                display: "flex",
                flexWrap:
                  "wrap",
                gap: 8,
                marginTop: 12,
              }}
            >
              {[
                result.runtime.id,
                result.runtime.version,
                result.runtime.stage,
                result.runtime.codename,
              ]
                .filter(
                  (
                    value,
                  ): value is string =>
                    Boolean(value),
                )
                .map(
                  (value) => (
                    <span
                      key={value}
                      style={{
                        padding:
                          "5px 9px",
                        borderRadius:
                          999,
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #e2e8f0",
                        color:
                          "#475569",
                        fontSize:
                          11,
                        fontWeight:
                          700,
                      }}
                    >
                      {value}
                    </span>
                  ),
                )}
            </div>
          )}

          {checks.length > 0 && (
            <div
              style={{
                marginTop: 16,
              }}
            >
              <div
                style={{
                  marginBottom:
                    8,
                  color:
                    "#334155",
                  fontSize:
                    12,
                  fontWeight:
                    800,
                }}
              >
                {copy.checks}
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gap: 7,
                }}
              >
                {checks.map(
                  (check) => (
                    <div
                      key={
                        check.id
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "flex-start",
                        gap: 9,
                        padding:
                          "9px 10px",
                        borderRadius:
                          10,
                        background:
                          "#f8fafc",
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          flexShrink: 0,
                          fontWeight:
                            900,
                          textAlign:
                            "center",
                        }}
                      >
                        {check.status ===
                        "pass"
                          ? "✓"
                          : check.status ===
                              "warn"
                            ? "△"
                            : "×"}
                      </span>

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#334155",
                            fontSize:
                              12,
                            fontWeight:
                              800,
                          }}
                        >
                          {check.id}
                        </div>

                        <div
                          style={{
                            marginTop:
                              2,
                            color:
                              "#64748b",
                            fontSize:
                              12,
                            lineHeight:
                              1.45,
                          }}
                        >
                          {
                            check.message
                          }
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {result.timestamp && (
            <div
              style={{
                marginTop: 12,
                color:
                  "#94a3b8",
                fontSize: 11,
              }}
            >
              {copy.lastVerified}:{" "}
              {new Date(
                result.timestamp,
              ).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      style={{
        padding:
          "11px 12px",
        borderRadius: 12,
        background:
          "#f8fafc",
        border:
          "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          color:
            "#0f172a",
          fontSize: 17,
          fontWeight: 900,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 2,
          color:
            "#64748b",
          fontSize: 11,
        }}
      >
        {label}
      </div>
    </div>
  );
}
