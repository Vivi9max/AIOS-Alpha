"use client";

import {
  useState,
} from "react";

type RadarSignal = {
  signalId: string;
  type: string;
  priority: string;
  symbol: string;
  market: string;
  title: string;
  description: string;
  materialChange: boolean;
  humanReviewRequired: boolean;
  sourceEventId: string | null;
  sourceVersion: string;
  detectedAt: string;
};

type RadarResult = {
  success: boolean;
  code: string;
  radar: {
    state: string;
    universeSize: number;
    evaluatedCount: number;
    eventCount: number;
    materialEventCount: number;
    highPriorityCount: number;
    blockedCount: number;
    noChangeCount: number;
    noHistoryCount: number;
    signals: RadarSignal[];
    generatedAt: string;
    latencyMs: number;
  };
};

const DEFAULT_UNIVERSE = [
  {
    symbol: "NVDA",
    market: "us",
  },
  {
    symbol: "0700.HK",
    market: "hk",
  },
  {
    symbol: "600519.SH",
    market: "cn",
  },
];

export default function MarketRadarPage() {
  const [
    result,
    setResult,
  ] =
    useState<RadarResult | null>(
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
    useState<string | null>(
      null,
    );

  async function runRadar() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/founder/market/radar",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                universe:
                  DEFAULT_UNIVERSE,

                includeNoChange:
                  true,

                includeNoHistory:
                  true,

                includeBlocked:
                  true,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            data?.code ??
            "Market Radar failed.",
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Market Radar failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 20px",
        background:
          "#050505",
        color: "#f5f5f5",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing:
                "0.12em",
              opacity: 0.55,
              marginBottom: 8,
            }}
          >
            PRIVATE FOUNDER ACCESS
          </div>

          <h1
            style={{
              fontSize: 32,
              margin: 0,
            }}
          >
            AIOS Market Radar
          </h1>

          <p
            style={{
              color:
                "#999",
              marginTop: 10,
              lineHeight: 1.6,
            }}
          >
            C154.1 · Market
            Change Monitoring
            Foundation
          </p>
        </div>

        <section
          style={{
            border:
              "1px solid #222",
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
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
              gap: 16,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <strong>
                Market Universe
              </strong>

              <div
                style={{
                  marginTop: 8,
                  color:
                    "#888",
                  fontSize: 13,
                }}
              >
                NVDA · 0700.HK ·
                600519.SH
              </div>
            </div>

            <button
              type="button"
              onClick={
                runRadar
              }
              disabled={
                loading
              }
              style={{
                border: 0,
                borderRadius: 10,
                padding:
                  "11px 18px",
                background:
                  "#fff",
                color:
                  "#000",
                fontWeight: 700,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              {loading
                ? "Running..."
                : "Run Market Radar"}
            </button>
          </div>
        </section>

        {error && (
          <section
            style={{
              border:
                "1px solid #522",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              color:
                "#ff9b9b",
            }}
          >
            {error}
          </section>
        )}

        {result && (
          <>
            <section
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(150px,1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                [
                  "State",
                  result.radar
                    .state,
                ],
                [
                  "Universe",
                  result.radar
                    .universeSize,
                ],
                [
                  "Events",
                  result.radar
                    .eventCount,
                ],
                [
                  "Material",
                  result.radar
                    .materialEventCount,
                ],
                [
                  "Priority",
                  result.radar
                    .highPriorityCount,
                ],
                [
                  "Blocked",
                  result.radar
                    .blockedCount,
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={
                      String(
                        label,
                      )
                    }
                    style={{
                      border:
                        "1px solid #222",
                      borderRadius:
                        12,
                      padding:
                        16,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          11,
                        color:
                          "#777",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          "0.08em",
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        marginTop:
                          8,
                        fontSize:
                          24,
                        fontWeight:
                          700,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ),
              )}
            </section>

            <section>
              <h2
                style={{
                  fontSize: 20,
                  marginBottom:
                    12,
                }}
              >
                Market Signals
              </h2>

              <div
                style={{
                  display:
                    "grid",
                  gap: 10,
                }}
              >
                {result.radar.signals
                  .map(
                    (
                      signal,
                    ) => (
                      <article
                        key={
                          signal.signalId
                        }
                        style={{
                          border:
                            "1px solid #222",
                          borderRadius:
                            12,
                          padding:
                            16,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            gap: 12,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <strong>
                            {
                              signal.symbol
                            }
                          </strong>

                          <span
                            style={{
                              fontSize:
                                11,
                              color:
                                "#999",
                            }}
                          >
                            {
                              signal.priority
                            }
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop:
                              8,
                            fontWeight:
                              600,
                          }}
                        >
                          {
                            signal.title
                          }
                        </div>

                        <p
                          style={{
                            color:
                              "#999",
                            lineHeight:
                              1.6,
                            margin:
                              "8px 0",
                          }}
                        >
                          {
                            signal.description
                          }
                        </p>

                        <div
                          style={{
                            fontSize:
                              11,
                            color:
                              "#666",
                          }}
                        >
                          Source:{" "}
                          {
                            signal.sourceVersion
                          }{" "}
                          · Human
                          review
                          required
                        </div>
                      </article>
                    ),
                  )}

                {result.radar
                  .signals
                  .length ===
                  0 && (
                  <div
                    style={{
                      color:
                        "#777",
                      padding:
                        20,
                      border:
                        "1px solid #222",
                      borderRadius:
                        12,
                    }}
                  >
                    No radar
                    signals
                    available.
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                marginTop: 24,
                padding: 16,
                border:
                  "1px solid #222",
                borderRadius: 12,
                color:
                  "#777",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              C154 is a
              monitoring and
              research layer.
              It does not
              authorize
              trading, Planner
              dispatch, or
              autonomous
              investment
              decisions.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
