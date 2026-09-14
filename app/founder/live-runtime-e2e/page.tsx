"use client";

import {
  useEffect,
  useState,
} from "react";

const STORAGE_KEY =
  "aios-founder-access-key";

type VerificationCheck = {
  name: string;
  pass: boolean;
  detail: string;
  latencyMs: number;
};

type ScenarioResult = {
  success?: boolean;
  planId?: string;
  planType?: string;
  intent?: string;
  webIntelligence?: {
    required?: boolean;
    success?: boolean;
    verified?: boolean;
    sourceCount?: number;
    sourceHosts?: string[];
  };
  liveDecision?: {
    success?: boolean;
    ready?: boolean;
    priority?: string;
    conclusion?: string;
    nextStep?: string;
  };
  answerPresent?: boolean;
  nativeDecisionAnswer?: boolean;
  capabilityDenial?: boolean;
  crowdedMarkdownTable?: boolean;
  answerPreview?: string;
};

type VerificationResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  runtime?: string;
  runtimeVersion?: string;
  timestamp?: number;
  latencyMs?: number;
  pipeline?: string;
  scenarios?: string[];
  checks?: VerificationCheck[];
  summary?: {
    passed?: number;
    total?: number;
    failed?: number;
  };
  scenarioResults?: Record<
    string,
    ScenarioResult
  >;
  error?: string;
};

function Status({
  value,
}: {
  value?: boolean;
}) {
  return (
    <span
      style={{
        fontWeight: 950,
        color:
          value
            ? "#166534"
            : "#b91c1c",
      }}
    >
      {value
        ? "PASS"
        : "FAIL"}
    </span>
  );
}

function ScenarioCard({
  name,
  result,
}: {
  name: string;
  result: ScenarioResult;
}) {
  const web =
    result.webIntelligence;

  const decision =
    result.liveDecision;

  return (
    <article
      style={{
        padding: 18,
        border:
          "1px solid #dbe3f0",
        borderRadius: 20,
        background:
          "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 12,
          alignItems:
            "center",
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 950,
          }}
        >
          {name}
        </div>

        <Status
          value={
            result.success === true &&
            result.capabilityDenial !==
              true &&
            result.crowdedMarkdownTable !==
              true
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 9,
          marginTop: 14,
        }}
      >
        <div
          style={{
            padding: 11,
            borderRadius: 13,
            background:
              "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 800,
            }}
          >
            RUNTIME
          </div>
          <div
            style={{
              marginTop: 4,
            }}
          >
            <Status
              value={
                result.success === true
              }
            />
          </div>
        </div>

        <div
          style={{
            padding: 11,
            borderRadius: 13,
            background:
              "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 800,
            }}
          >
            WEB
          </div>
          <div
            style={{
              marginTop: 4,
            }}
          >
            <Status
              value={
                web?.success === true &&
                web?.verified === true
              }
            />
          </div>
        </div>

        <div
          style={{
            padding: 11,
            borderRadius: 13,
            background:
              "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 800,
            }}
          >
            DECISION
          </div>
          <div
            style={{
              marginTop: 4,
            }}
          >
            <Status
              value={
                decision?.success === true &&
                decision?.ready === true
              }
            />
          </div>
        </div>

        <div
          style={{
            padding: 11,
            borderRadius: 13,
            background:
              "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 800,
            }}
          >
            ANSWER
          </div>
          <div
            style={{
              marginTop: 4,
            }}
          >
            <Status
              value={
                result.answerPresent === true
              }
            />
          </div>
        </div>
      </div>

      {decision?.conclusion && (
        <div
          style={{
            marginTop: 14,
            padding: 13,
            borderRadius: 14,
            background:
              "#f0fdf4",
            color: "#166534",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>
            Conclusion
          </strong>
          <div
            style={{
              marginTop: 4,
            }}
          >
            {decision.conclusion}
          </div>
        </div>
      )}

      {decision?.nextStep && (
        <div
          style={{
            marginTop: 9,
            padding: 13,
            borderRadius: 14,
            background:
              "#eff6ff",
            color: "#1d4ed8",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>
            Next Step
          </strong>
          <div
            style={{
              marginTop: 4,
            }}
          >
            {decision.nextStep}
          </div>
        </div>
      )}

      {web?.sourceHosts &&
        web.sourceHosts.length >
          0 && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            {web.sourceCount ?? 0}
            {" source(s) · "}
            {web.sourceHosts.join(
              " · ",
            )}
          </div>
        )}

      {result.answerPreview && (
        <details
          style={{
            marginTop: 12,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              color: "#475569",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            查看 Runtime Answer Preview
          </summary>

          <div
            style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 12,
              background:
                "#f8fafc",
              color: "#475569",
              fontSize: 12,
              lineHeight: 1.7,
              whiteSpace:
                "pre-wrap",
            }}
          >
            {result.answerPreview}
          </div>
        </details>
      )}

      {result.capabilityDenial ===
        true && (
        <div
          style={{
            marginTop: 10,
            color: "#b91c1c",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Detected false capability denial.
        </div>
      )}

      {result.crowdedMarkdownTable ===
        true && (
        <div
          style={{
            marginTop: 6,
            color: "#b91c1c",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Detected crowded Markdown table.
        </div>
      )}
    </article>
  );
}

export default function LiveRuntimeE2EPage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [result, setResult] =
    useState<
      VerificationResponse | null
    >(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const stored =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      ) ?? "";

    setAccessKey(stored);
  }, []);

  async function runVerification() {
    const key =
      accessKey.trim();

    if (!key) {
      setError(
        "未检测到 Founder Session。请先打开 Founder Console 并完成认证。",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/live-runtime-e2e-verification",
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
        (await response.json()) as
          VerificationResponse;

      setResult(data);

      if (
        response.status === 401
      ) {
        setError(
          "Founder Session 已失效，请重新进入 Founder Console 完成认证。",
        );
      } else if (
        !response.ok ||
        !data.success
      ) {
        setError(
          `E2E Verification failed (HTTP ${response.status}).`,
        );
      }
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Runtime E2E verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const passed =
    result?.success === true &&
    result?.verified === true &&
    result?.code ===
      "C143_25_RUNTIME_E2E_PASS";

  const scenarioResults =
    result?.scenarioResults ?? {};

  return (
    <main
      style={{
        minHeight: "100vh",
        padding:
          "24px 18px 60px",
        boxSizing:
          "border-box",
        background:
          "#f4f6fb",
        color:
          "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 920,
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
            Runtime E2E
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color: "#64748b",
              lineHeight: 1.6,
            }}
          >
            C143.25.1 Main Runtime
            End-to-End Regression
          </p>
        </header>

        <section
          style={{
            marginTop: 22,
            padding: 20,
            border:
              "1px solid #dbe3f0",
            borderRadius: 22,
            background:
              "#ffffff",
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 950,
            }}
          >
            Runtime → Planner → Web →
            Verification → Decision →
            Native Answer
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
            自动复用当前 Founder Session，
            不需要在 URL 中输入或暴露 Access Key。
          </p>

          <button
            type="button"
            onClick={() =>
              void runVerification()
            }
            disabled={loading}
            style={{
              width: "100%",
              minHeight: 54,
              marginTop: 18,
              border: 0,
              borderRadius: 15,
              background:
                loading
                  ? "#94a3b8"
                  : "#0f172a",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 900,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "正在执行真实 Runtime E2E 验证..."
              : "▶ Run C143.25 E2E Verification"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 14,
                background:
                  "#fff1f2",
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
          <>
            <section
              style={{
                marginTop: 18,
                padding: 20,
                border:
                  passed
                    ? "1px solid #86efac"
                    : "1px solid #fecaca",
                borderRadius: 22,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 950,
                  color:
                    passed
                      ? "#166534"
                      : "#b91c1c",
                }}
              >
                {passed
                  ? "✓ RUNTIME E2E: VERIFIED"
                  : "✕ RUNTIME E2E: FAILED"}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                {result.summary?.passed ??
                  0}
                {" / "}
                {result.summary?.total ??
                  0}
                {" checks passed"}
                {" · "}
                {result.summary?.failed ??
                  0}
                {" failed"}
                {" · "}
                {result.latencyMs ??
                  0}
                ms
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 13,
                  background:
                    "#f8fafc",
                  color: "#475569",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {result.pipeline ??
                  "executeRuntime E2E pipeline"}
              </div>
            </section>

            <section
              style={{
                marginTop: 18,
                display: "grid",
                gap: 12,
              }}
            >
              {Object.entries(
                scenarioResults,
              ).map(
                ([
                  name,
                  scenarioResult,
                ]) => (
                  <ScenarioCard
                    key={name}
                    name={name}
                    result={
                      scenarioResult
                    }
                  />
                ),
              )}
            </section>

            <section
              style={{
                marginTop: 18,
                padding: 18,
                border:
                  "1px solid #dbe3f0",
                borderRadius: 20,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                Detailed Checks
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                {result.checks?.map(
                  (check) => (
                    <div
                      key={`${check.name}-${check.latencyMs}`}
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        padding:
                          "11px 12px",
                        borderRadius:
                          12,
                        background:
                          "#f8fafc",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              13,
                            fontWeight:
                              800,
                          }}
                        >
                          {check.name}
                        </div>

                        <div
                          style={{
                            marginTop:
                              3,
                            color:
                              "#64748b",
                            fontSize:
                              11,
                            lineHeight:
                              1.5,
                          }}
                        >
                          {check.detail}
                        </div>
                      </div>

                      <div
                        style={{
                          flexShrink: 0,
                        }}
                      >
                        <Status
                          value={
                            check.pass
                          }
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
