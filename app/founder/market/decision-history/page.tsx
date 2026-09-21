"use client";

import {
  useState,
} from "react";

type TimelineEntry = {
  version: number;
  recordId: string;
  symbol: string;
  market: string;
  state: string;
  reviewStatus: string;
  generatedAt: string;
  savedAt: string;
  reassessment: {
    changeType?: string;
    severity?: string;
    whatChanged?: string[];
    whyItMatters?: string[];
  } | null;
  humanDecisionRequired: boolean;
};

type QueryResult = {
  success: boolean;
  code: string;
  historyFound: boolean;
  historyId: string | null;
  symbol: string;
  market: string;
  currentVersion: number;
  totalVersions: number;
  entries: TimelineEntry[];
  latestRecordId: string | null;
  storage: {
    mode: string;
    persistent: boolean;
  };
  humanDecisionRequired: boolean;
  readOnly: boolean;
  runtime: {
    version: string;
    latencyMs: number;
  };
};

function getFounderKey(): string {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    window.sessionStorage.getItem(
      "aios-founder-access-key",
    ) ?? ""
  );
}

export default function MarketDecisionHistoryPage() {
  const [
    symbol,
    setSymbol,
  ] = useState(
    "NVDA",
  );

  const [
    market,
    setMarket,
  ] = useState(
    "us",
  );

  const [
    result,
    setResult,
  ] =
    useState<
      QueryResult | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  async function loadHistory() {
    setLoading(true);

    setError(null);

    try {
      const key =
        getFounderKey();

      const params =
        new URLSearchParams();

      params.set(
        "symbol",
        symbol.trim(),
      );

      params.set(
        "market",
        market,
      );

      params.set(
        "limit",
        "20",
      );

      params.set(
        "includeReassessment",
        "true",
      );

      const response =
        await fetch(
          `/api/founder/market/decision-history/query?${params.toString()}`,
          {
            method:
              "GET",

            headers:
              key
                ? {
                    Authorization:
                      `Bearer ${key}`,
                  }
                : {},
          },
        );

      const payload =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          payload?.error ??
            payload?.code ??
            `HTTP ${response.status}`,
        );
      }

      setResult(
        payload,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "History query failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#050505",

        color:
          "#f5f5f5",

        padding:
          "30px 18px",

        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth:
            900,

          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            fontSize:
              12,

            letterSpacing:
              1.5,

            opacity:
              0.55,
          }}
        >
          PRIVATE FOUNDER ACCESS
        </div>

        <h1
          style={{
            fontSize:
              28,

            margin:
              "10px 0 6px",
          }}
        >
          Market Decision History
        </h1>

        <div
          style={{
            opacity:
              0.6,

            marginBottom:
              24,
          }}
        >
          C147.10 · Read-only Timeline
          · Previous Decision → Current
          Decision → Reassessment
        </div>

        <section
          style={{
            border:
              "1px solid #262626",

            borderRadius:
              12,

            padding:
              18,

            marginBottom:
              18,
          }}
        >
          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "1fr 120px",

              gap:
                10,
            }}
          >
            <input
              value={
                symbol
              }
              onChange={(
                event,
              ) =>
                setSymbol(
                  event.target
                    .value,
                )
              }
              placeholder="Symbol"
              style={{
                background:
                  "#111",

                color:
                  "#fff",

                border:
                  "1px solid #333",

                borderRadius:
                  8,

                padding:
                  "12px",
              }}
            />

            <select
              value={
                market
              }
              onChange={(
                event,
              ) =>
                setMarket(
                  event.target
                    .value,
                )
              }
              style={{
                background:
                  "#111",

                color:
                  "#fff",

                border:
                  "1px solid #333",

                borderRadius:
                  8,

                padding:
                  "12px",
              }}
            >
              <option value="us">
                US
              </option>

              <option value="hk">
                HK
              </option>

              <option value="cn">
                CN
              </option>
            </select>
          </div>

          <button
            onClick={
              loadHistory
            }
            disabled={
              loading
            }
            style={{
              width:
                "100%",

              marginTop:
                12,

              padding:
                "13px",

              borderRadius:
                8,

              border:
                "1px solid #444",

              background:
                loading
                  ? "#222"
                  : "#f5f5f5",

              color:
                loading
                  ? "#aaa"
                  : "#000",

              fontWeight:
                700,
            }}
          >
            {loading
              ? "Reading History..."
              : "▶ Read Decision History"}
          </button>
        </section>

        {error && (
          <section
            style={{
              padding:
                16,

              border:
                "1px solid #633",

              borderRadius:
                10,

              marginBottom:
                18,
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
                  "repeat(4, minmax(0, 1fr))",

                gap:
                  10,

                marginBottom:
                  18,
              }}
            >
              {[
                [
                  "Security",
                  `${result.symbol} / ${result.market.toUpperCase()}`,
                ],

                [
                  "Versions",
                  result.totalVersions,
                ],

                [
                  "Current",
                  result.currentVersion,
                ],

                [
                  "Storage",
                  result.storage.mode,
                ],
              ].map(
                ([
                  label,
                  value,
                ]) => (
                  <div
                    key={
                      label
                    }
                    style={{
                      border:
                        "1px solid #252525",

                      borderRadius:
                        10,

                      padding:
                        13,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          11,

                        opacity:
                          0.5,
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        marginTop:
                          6,

                        fontWeight:
                          700,

                        wordBreak:
                          "break-word",
                      }}
                    >
                      {
                        value
                      }
                    </div>
                  </div>
                ),
              )}
            </section>

            <div
              style={{
                fontSize:
                  12,

                opacity:
                  0.55,

                marginBottom:
                  16,
              }}
            >
              Read-only:{" "}
              {result.readOnly
                ? "YES"
                : "NO"}
              {" · "}
              Human Review:{" "}
              {result.humanDecisionRequired
                ? "REQUIRED"
                : "NO"}
              {" · "}
              Runtime:{" "}
              {
                result.runtime
                  .latencyMs
              }
              ms
            </div>

            {result.entries.map(
              (
                entry,
              ) => (
                <article
                  key={
                    `${entry.recordId}-${entry.version}`
                  }
                  style={{
                    border:
                      "1px solid #252525",

                    borderRadius:
                      12,

                    padding:
                      18,

                    marginBottom:
                      14,
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
                    }}
                  >
                    <strong>
                      Version{" "}
                      {
                        entry.version
                      }
                    </strong>

                    <span
                      style={{
                        opacity:
                          0.65,

                        fontSize:
                          12,
                      }}
                    >
                      {
                        entry.state
                      }
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop:
                        8,

                      fontSize:
                        13,

                      opacity:
                        0.65,
                    }}
                  >
                    Review:{" "}
                    {
                      entry.reviewStatus
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        5,

                      fontSize:
                        12,

                      opacity:
                        0.5,
                    }}
                  >
                    Generated:{" "}
                    {
                      entry.generatedAt
                    }
                  </div>

                  {entry.reassessment && (
                    <div
                      style={{
                        marginTop:
                          16,

                        padding:
                          13,

                        border:
                          "1px solid #292929",

                        borderRadius:
                          9,
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            700,

                          marginBottom:
                            7,
                        }}
                      >
                        Reassessment
                      </div>

                      <div
                        style={{
                          fontSize:
                            13,

                          opacity:
                            0.75,
                        }}
                      >
                        Change:{" "}
                        {
                          entry
                            .reassessment
                            .changeType
                        }
                        {" · "}
                        Severity:{" "}
                        {
                          entry
                            .reassessment
                            .severity
                        }
                      </div>

                      {entry
                        .reassessment
                        .whatChanged
                        ?.map(
                          (
                            change,
                          ) => (
                            <div
                              key={
                                change
                              }
                              style={{
                                marginTop:
                                  7,

                                fontSize:
                                  13,

                                opacity:
                                  0.7,
                              }}
                            >
                              •{" "}
                              {
                                change
                              }
                            </div>
                          ),
                        )}
                    </div>
                  )}
                </article>
              ),
            )}
          </>
        )}
      </div>
    </main>
  );
}
