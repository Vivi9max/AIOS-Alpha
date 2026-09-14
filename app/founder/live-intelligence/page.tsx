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
  sourceCount?: number;
  sourceHosts?: string[];
};

type VerificationResponse = {
  success?: boolean;
  verified?: boolean;
  code?: string;
  runtime?: string;
  runtimeVersion?: string;
  timestamp?: number;
  latencyMs?: number;
  checks?: {
    route?: boolean;
    webSearch?: boolean;
    evidence?: boolean;
    verification?: boolean;
    analysis?: boolean;
    answer?: boolean;
    noWebRegression?: boolean;
    finalRegressionPass?: boolean;
  };
  results?: VerificationCheck[];
  summary?: {
    passed?: number;
    total?: number;
  };
};

function Status({
  value,
}: {
  value?: boolean;
}) {
  return (
    <span
      style={{
        fontWeight: 900,
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

export default function LiveIntelligenceVerificationPage() {
  const [accessKey, setAccessKey] =
    useState("");

  const [result, setResult] =
    useState<VerificationResponse | null>(
      null,
    );

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
        "未检测到 Founder Access Key。请先进入 Founder Console。",
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await fetch(
          "/api/founder/live-intelligence-verification",
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
        (await response.json()) as VerificationResponse;

      setResult(data);

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          `Verification failed (HTTP ${response.status}).`,
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Live Intelligence verification failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  const checks =
    result?.checks;

  const passed =
    result?.success === true &&
    result?.verified === true &&
    checks?.finalRegressionPass ===
      true &&
    result?.code ===
      "C143_15_LIVE_INTELLIGENCE_VERIFIED";

  return (
    <main
      style={{
        minHeight:
          "100vh",
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
          maxWidth: 900,
          margin:
            "0 auto",
        }}
      >
        <header>
          <div
            style={{
              color:
                "#2563eb",
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
              lineHeight:
                1.15,
            }}
          >
            Live Intelligence
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color:
                "#64748b",
              lineHeight:
                1.6,
            }}
          >
            C143.15 Production
            Runtime Verification
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
              fontWeight: 900,
              fontSize: 17,
            }}
          >
            Router → Web → Evidence → Verification
          </div>

          <p
            style={{
              margin:
                "8px 0 0",
              color:
                "#64748b",
              fontSize: 13,
              lineHeight:
                1.6,
            }}
          >
            这不是页面演示，而是直接调用生产 Runtime
            验证真实联网能力。
          </p>

          <button
            type="button"
            onClick={() =>
              void runVerification()
            }
            disabled={loading}
            style={{
              width:
                "100%",
              minHeight:
                54,
              marginTop:
                18,
              border: 0,
              borderRadius:
                15,
              background:
                loading
                  ? "#94a3b8"
                  : "#0f172a",
              color:
                "#ffffff",
              fontSize: 16,
              fontWeight:
                900,
              cursor:
                loading
                  ? "wait"
                  : "pointer",
            }}
          >
            {loading
              ? "正在执行真实 Live Intelligence 验证…"
              : "▶ Run C143.15 Verification"}
          </button>

          {error && (
            <div
              style={{
                marginTop:
                  14,
                padding:
                  14,
                borderRadius:
                  14,
                background:
                  "#fff1f2",
                color:
                  "#be123c",
                fontSize: 13,
                lineHeight:
                  1.6,
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
                marginTop:
                  18,
                padding:
                  20,
                border:
                  passed
                    ? "1px solid #86efac"
                    : "1px solid #fecaca",
                borderRadius:
                  22,
                background:
                  "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize:
                    22,
                  fontWeight:
                    950,
                  color:
                    passed
                      ? "#166534"
                      : "#b91c1c",
                }}
              >
                {passed
                  ? "✓ RUNTIME INTEGRITY: VERIFIED"
                  : "✕ LIVE INTELLIGENCE VERIFICATION FAILED"}
              </div>

              <div
                style={{
                  marginTop:
                    8,
                  color:
                    "#64748b",
                  fontSize:
                    13,
                }}
              >
                {result.summary?.passed ??
                  0}
                {" / "}
                {result.summary?.total ??
                  0}
                {" checks passed"}
                {" · "}
                {result.latencyMs ??
                  0}
                ms
              </div>

              <div
                style={{
                  marginTop:
                    20,
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap:
                    10,
                }}
              >
                {[
                  [
                    "Route",
                    checks?.route,
                  ],
                  [
                    "Web Search",
                    checks?.webSearch,
                  ],
                  [
                    "Evidence",
                    checks?.evidence,
                  ],
                  [
                    "Verification",
                    checks?.verification,
                  ],
                  [
                    "Analysis",
                    checks?.analysis,
                  ],
                  [
                    "Answer",
                    checks?.answer,
                  ],
                  [
                    "No-Web Regression",
                    checks?.noWebRegression,
                  ],
                ].map(
                  ([label, value]) => (
                    <div
                      key={
                        String(label)
                      }
                      style={{
                        padding:
                          14,
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          16,
                        background:
                          "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            12,
                          color:
                            "#64748b",
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
                          fontSize:
                            16,
                        }}
                      >
                        <Status
                          value={
                            Boolean(
                              value,
                            )
                          }
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section
              style={{
                marginTop:
                  18,
              }}
            >
              {result.results?.map(
                (item) => (
                  <article
                    key={
                      item.name
                    }
                    style={{
                      marginBottom:
                        12,
                      padding:
                        18,
                      border:
                        "1px solid #dbe3f0",
                      borderRadius:
                        18,
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
                        gap:
                          12,
                        alignItems:
                          "center",
                      }}
                    >
                      <strong>
                        {item.name}
                      </strong>

                      <Status
                        value={
                          item.pass
                        }
                      />
                    </div>

                    <p
                      style={{
                        margin:
                          "8px 0 0",
                        color:
                          "#64748b",
                        fontSize:
                          13,
                        lineHeight:
                          1.6,
                      }}
                    >
                      {item.detail}
                    </p>

                    <div
                      style={{
                        marginTop:
                          9,
                        color:
                          "#94a3b8",
                        fontSize:
                          12,
                      }}
                    >
                      {item.latencyMs}
                      ms
                      {typeof item.sourceCount ===
                        "number"
                        ? ` · ${item.sourceCount} source(s)`
                        : ""}
                    </div>

                    {item.sourceHosts &&
                      item.sourceHosts
                        .length >
                        0 && (
                        <div
                          style={{
                            marginTop:
                              8,
                            fontSize:
                              12,
                            color:
                              "#475569",
                          }}
                        >
                          {item.sourceHosts.join(
                            " · ",
                          )}
                        </div>
                      )}
                  </article>
                ),
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
